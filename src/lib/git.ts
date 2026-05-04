import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface CommitSchedule {
  file: string;
  date: Date;
  message: string;
}

export class GitService {
  /**
   * Run a git command in a specific directory
   */
  static async runCommand(cmd: string, cwd: string, env: Record<string, string> = {}): Promise<string> {
    try {
      const { stdout } = await execAsync(cmd, { 
        cwd, 
        env: { ...process.env, ...env } 
      });
      return stdout.trim();
    } catch (error: unknown) {
      if (error instanceof Error) {
        const stderr = (error as { stderr?: string }).stderr;
        throw new Error(`[Git Command Failed: ${cmd}] ${stderr || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get the current global git user
   */
  static async getCurrentUser(): Promise<{ name: string, email: string }> {
    try {
      const name = await this.runCommand('git config user.name', process.cwd());
      const email = await this.runCommand('git config user.email', process.cwd());
      return { name: name || 'Ghost Engineer', email: email || 'ghost@internals.io' };
    } catch {
      return { name: 'Ghost Engineer', email: 'ghost@internals.io' };
    }
  }

  /**
   * Recursively get all files in a directory (excluding .git and node_modules)
   */
  static async getFileList(dir: string, baseDir: string = dir): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(entries.map(async (entry) => {
      const res = path.resolve(dir, entry.name);
      const ignoredNames = ['.git', 'node_modules', '.next', 'dist', '.DS_Store', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
      if (ignoredNames.includes(entry.name) || entry.name.startsWith('.env')) {
        return [];
      }
      return entry.isDirectory() ? this.getFileList(res, baseDir) : [path.relative(baseDir, res)];
    }));
    return files.flat();
  }

  /**
   * Analyze file dependencies to determine a logical commit order
   */
  static async analyzeDependencies(sourcePath: string, files: string[]): Promise<string[]> {
    const dependencyMap: Record<string, string[]> = {};
    
    for (const file of files) {
      if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
        dependencyMap[file] = [];
        continue;
      }

      const content = await fs.readFile(path.join(sourcePath, file), 'utf-8');
      const imports: string[] = [];
      
      // Basic regex for imports
      const importRegex = /from\s+['"]\.(.*)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        const importedPath = match[1];
        // Resolve the imported path relative to the current file
        const absoluteImportedPath = path.resolve(path.dirname(path.join(sourcePath, file)), importedPath);
        const relativeImportedPath = path.relative(sourcePath, absoluteImportedPath);
        
        // Find if this path exists in our file list (with common extensions)
        const possibleFiles = [
          relativeImportedPath,
          `${relativeImportedPath}.ts`,
          `${relativeImportedPath}.tsx`,
          `${relativeImportedPath}.js`,
          `${relativeImportedPath}.jsx`,
          path.join(relativeImportedPath, 'index.ts'),
          path.join(relativeImportedPath, 'index.tsx'),
        ];

        const actualFile = files.find(f => possibleFiles.includes(f));
        if (actualFile && actualFile !== file) {
          imports.push(actualFile);
        }
      }
      dependencyMap[file] = imports;
    }

    // Topological Sort
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const result: string[] = [];

    const visit = (file: string) => {
      if (tempVisited.has(file)) return; // Cycle detected, just ignore and proceed
      if (visited.has(file)) return;

      tempVisited.add(file);
      const deps = dependencyMap[file] || [];
      for (const dep of deps) {
        visit(dep);
      }
      tempVisited.delete(file);
      visited.add(file);
      result.push(file);
    };

    for (const file of files) {
      visit(file);
    }

    // Heuristic override: ensure utils/lib folders come first if not caught by imports
    return result.sort((a, b) => {
      const aScore = this.getHeuristicScore(a);
      const bScore = this.getHeuristicScore(b);
      return aScore - bScore;
    });
  }

  private static getHeuristicScore(file: string): number {
    if (file.includes('utils/') || file.includes('lib/') || file.includes('helpers/')) return 1;
    if (file.includes('types/') || file.includes('interfaces/')) return 2;
    if (file.includes('services/') || file.includes('api/')) return 3;
    if (file.includes('controllers/') || file.includes('models/')) return 4;
    if (file.includes('components/') || file.includes('ui/')) return 5;
    if (file.includes('pages/') || file.includes('app/')) return 6;
    return 10;
  }

  /**
   * Get files that are new or modified in source relative to target
   */
  static async getIncrementalFiles(sourcePath: string, targetPath: string, allFiles: string[]): Promise<string[]> {
    const newFiles: string[] = [];
    
    for (const file of allFiles) {
      const sourceFile = path.join(sourcePath, file);
      const targetFile = path.join(targetPath, file);
      
      try {
        const sourceStat = await fs.stat(sourceFile);
        const targetStat = await fs.stat(targetFile);
        
        if (sourceStat.size !== targetStat.size) {
          newFiles.push(file);
          continue;
        }

        // Deep comparison if sizes match
        const sourceBuf = await fs.readFile(sourceFile);
        const targetBuf = await fs.readFile(targetFile);
        if (!sourceBuf.equals(targetBuf)) {
          newFiles.push(file);
        }
      } catch {
        // File doesn't exist in target
        newFiles.push(file);
      }
    }
    
    return newFiles;
  }

  /**
   * Get the date of the last commit in the target repository
   */
  static async getLastCommitDate(targetPath: string): Promise<Date | null> {
    try {
      const output = await this.runCommand('git log -1 --format=%aI', targetPath);
      return output ? new Date(output) : null;
    } catch {
      return null;
    }
  }

  /**
   * Generate a schedule of commits using Poisson distribution and working windows
   */
  static generateSchedule(startDate: Date, files: string[]): CommitSchedule[] {
    const now = new Date();
    const totalDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Average commits per day
    const lambda = files.length / Math.max(1, totalDays);
    
    const schedule: CommitSchedule[] = [];
    let fileIndex = 0;
    const currentDate = new Date(startDate);

    while (fileIndex < files.length) {
      // Is it a weekend? Skip to Monday
      const day = currentDate.getDay();
      if (day === 0) { // Sunday
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }
      if (day === 6) { // Saturday
        currentDate.setDate(currentDate.getDate() + 2);
        continue;
      }

      // Determine how many commits for today using Poisson
      let commitsToday = this.getPoisson(lambda);
      if (fileIndex + commitsToday > files.length) {
        commitsToday = files.length - fileIndex;
      }

      // If lambda is very low (less than 1), ensure we don't have too many empty days
      if (commitsToday === 0 && Math.random() < lambda) {
        commitsToday = 1;
      }

      if (commitsToday > 0) {
        for (let i = 0; i < commitsToday && fileIndex < files.length; i++) {
          const file = files[fileIndex++];
          
          // Generate a random time between 9 AM and 5 PM
          const hour = 9 + Math.floor(Math.random() * 8);
          const minute = Math.floor(Math.random() * 60);
          const second = Math.floor(Math.random() * 60);
          
          const commitDate = new Date(currentDate);
          commitDate.setHours(hour, minute, second);

          schedule.push({
            file,
            date: commitDate,
            message: this.generateCommitMessage(file)
          });
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      if (currentDate > now) break;
    }

    // If we have files left but reached "now", dump them into today
    while (fileIndex < files.length) {
      const file = files[fileIndex++];
      schedule.push({
        file,
        date: new Date(),
        message: this.generateCommitMessage(file)
      });
    }

    return schedule;
  }

  private static getPoisson(lambda: number): number {
    const L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;
    do {
      k++;
      p *= Math.random();
    } while (p > L);
    return k - 1;
  }

  private static generateCommitMessage(file: string): string {
    const filename = path.basename(file);
    const action = ['Add', 'Implement', 'Create', 'Setup', 'Initialize'][Math.floor(Math.random() * 5)];
    return `${action} ${filename}`;
  }

  /**
   * Execute a retroactive commit
   */
  static async executeRetroCommit(
    sourcePath: string, 
    targetPath: string, 
    commit: CommitSchedule,
    authorName?: string,
    authorEmail?: string
  ): Promise<void> {
    const sourceFile = path.join(sourcePath, commit.file);
    const targetFile = path.join(targetPath, commit.file);

    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    
    // Copy file
    await fs.copyFile(sourceFile, targetFile);

    // Get fallback identity if needed
    let name = authorName;
    let email = authorEmail;
    if (!name || !email) {
      const current = await this.getCurrentUser();
      name = name || current.name;
      email = email || current.email;
    }

    // Git commands
    const dateStr = commit.date.toISOString();
    const env = {
      GIT_AUTHOR_DATE: dateStr,
      GIT_COMMITTER_DATE: dateStr,
      GIT_AUTHOR_NAME: name,
      GIT_AUTHOR_EMAIL: email,
      GIT_COMMITTER_NAME: name,
      GIT_COMMITTER_EMAIL: email
    };

    await this.runCommand(`git add -f "${commit.file}"`, targetPath);
    // Use --allow-empty to avoid failure if the file copy resulted in no changes (e.g. re-running on same dir)
    await this.runCommand(`git commit --allow-empty -m "${commit.message}"`, targetPath, env);
  }

  /**
   * Initialize a new git repository at target path
   */
  static async initRepo(targetPath: string): Promise<void> {
    await fs.mkdir(targetPath, { recursive: true });
    try {
      await this.runCommand('git init -b main', targetPath);
    } catch {
      // Already initialized or failed, ignore
    }
  }
}

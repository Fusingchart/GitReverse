import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourcePath, targetPath, startDate, remoteUrl } = body;

  if (!sourcePath || !targetPath || !startDate) {
    return NextResponse.json({ error: 'Source, target, and start date are required' }, { status: 400 });
  }

  try {
    // 1. Initialize repo (silent if already exists)
    await GitService.initRepo(targetPath);

    // 2. Analyze
    const allFiles = await GitService.getFileList(sourcePath);
    const filesToCommit = await GitService.getIncrementalFiles(sourcePath, targetPath, allFiles);
    
    if (filesToCommit.length === 0) {
      return NextResponse.json({ success: true, commitCount: 0, message: 'Codebase is already up to date.' });
    }

    const sortedFiles = await GitService.analyzeDependencies(sourcePath, filesToCommit);
    
    // Start from the last commit date if incremental
    let effectiveStartDate = new Date(startDate);
    const lastDate = await GitService.getLastCommitDate(targetPath);
    if (lastDate && lastDate > effectiveStartDate) {
      effectiveStartDate = lastDate;
    }

    const schedule = GitService.generateSchedule(effectiveStartDate, sortedFiles);

    // 3. Execute
    for (const commit of schedule) {
      await GitService.executeRetroCommit(sourcePath, targetPath, commit);
    }

    // 4. Push to remote if provided
    if (remoteUrl) {
      try {
        await GitService.runCommand(`git remote add origin ${remoteUrl}`, targetPath);
      } catch {
        // If remote exists, just try to push
      }
      await GitService.runCommand('git push -u origin main -f', targetPath);
    }

    return NextResponse.json({ 
      success: true, 
      commitCount: schedule.length,
      message: `Successfully generated ${schedule.length} commits${remoteUrl ? ' and pushed to remote' : ''}.`
    });
  } catch (error: unknown) {
    console.error('Generation Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

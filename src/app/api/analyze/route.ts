import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';

export async function POST(req: NextRequest) {
  try {
    const { sourcePath, targetPath, startDate } = await req.json();

    if (!sourcePath || !startDate) {
      return NextResponse.json({ error: 'Source path and start date are required' }, { status: 400 });
    }

    const allFiles = await GitService.getFileList(sourcePath);
    let filesToCommit = allFiles;

    if (targetPath) {
      filesToCommit = await GitService.getIncrementalFiles(sourcePath, targetPath, allFiles);
    }

    const sortedFiles = await GitService.analyzeDependencies(sourcePath, filesToCommit);
    
    // Start from the last commit date if incremental
    let effectiveStartDate = new Date(startDate);
    if (targetPath) {
      const lastDate = await GitService.getLastCommitDate(targetPath);
      if (lastDate && lastDate > effectiveStartDate) {
        effectiveStartDate = lastDate;
      }
    }

    const schedule = GitService.generateSchedule(effectiveStartDate, sortedFiles);

    return NextResponse.json({ 
      fileCount: filesToCommit.length,
      totalFiles: allFiles.length,
      schedule: schedule.map(s => ({
        ...s,
        date: s.date.toISOString()
      }))
    });
  } catch (error: unknown) {
    console.error('Analysis Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

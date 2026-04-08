import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sourcePath, targetPath, startDate, remoteUrl } = body;

  if (!sourcePath || !targetPath || !startDate) {
    return NextResponse.json({ error: 'Source, target, and start date are required' }, { status: 400 });
  }

  try {
    // 1. Initialize repo
    await GitService.initRepo(targetPath);

    // 2. Analyze
    const files = await GitService.getFileList(sourcePath);
    const sortedFiles = await GitService.analyzeDependencies(sourcePath, files);
    const schedule = GitService.generateSchedule(new Date(startDate), sortedFiles);

    // 3. Execute (this could take a while, in a real app we might want to use a background worker or stream progress)
    // For now, we'll execute all and return success. 
    // Optimization: The UI can call this in chunks if needed, but for simplicity we do it in one go.
    
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

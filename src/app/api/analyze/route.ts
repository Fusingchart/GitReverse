import { NextRequest, NextResponse } from 'next/server';
import { GitService } from '@/lib/git';

export async function POST(req: NextRequest) {
  try {
    const { sourcePath, startDate } = await req.json();

    if (!sourcePath || !startDate) {
      return NextResponse.json({ error: 'Source path and start date are required' }, { status: 400 });
    }

    const files = await GitService.getFileList(sourcePath);
    const sortedFiles = await GitService.analyzeDependencies(sourcePath, files);
    const schedule = GitService.generateSchedule(new Date(startDate), sortedFiles);

    return NextResponse.json({ 
      fileCount: files.length,
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

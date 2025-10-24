import Link from 'next/link';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    symbol: string;
    description?: string;
    logoUrl?: string;
    leaderboard?: {
      _count: {
        entries: number;
      };
    };
  };
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const participantCount = project.leaderboard?._count?.entries || 0;

  return (
    <Link href={`/project/${project.id}`}>
      <div className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition cursor-pointer h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {project.logoUrl ? (
              <img
                src={project.logoUrl}
                alt={project.name}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                {project.symbol.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white">{project.name}</h3>
              <p className="text-gray-400">${project.symbol}</p>
            </div>
          </div>
        </div>

        {project.description && (
          <p className="text-gray-400 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-400">
            <span className="text-white font-semibold">{participantCount}</span>{' '}
            participants
          </div>
          <div className="text-primary-400 font-semibold">
            View Leaderboard →
          </div>
        </div>
      </div>
    </Link>
  );
}

import Head from 'next/head';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useProjects } from '@/lib/hooks/useProjects';
import ProjectCard from '@/components/ProjectCard';
import Header from '@/components/Header';

export default function Home() {
  const { data: projects, isLoading } = useProjects();

  return (
    <>
      <Head>
        <title>SafuInfoFi Dashboard - Web3 Social Intelligence</title>
        <meta
          name="description"
          content="Track and rank community engagement for Web3 projects"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Header />

        <main className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <section className="text-center py-16">
            <h1 className="text-5xl font-bold text-white mb-4">
              SafuInfoFi Dashboard
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Social Intelligence for Web3 Projects
            </p>
            <ConnectButton />
          </section>

          {/* Projects Section */}
          <section className="py-8">
            <h2 className="text-3xl font-bold text-white mb-6">
              Active Projects
            </h2>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 bg-slate-800 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects?.data?.map((project: any) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}

            {!isLoading && (!projects?.data || projects.data.length === 0) && (
              <div className="text-center py-16">
                <p className="text-gray-400 text-lg">
                  No active projects yet. Check back soon!
                </p>
              </div>
            )}
          </section>

          {/* Features Section */}
          <section className="py-16">
            <h2 className="text-3xl font-bold text-white mb-8 text-center">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                title="Link Your Wallet"
                description="Connect your wallet with .safu domain and X account to participate"
                icon="🔗"
              />
              <FeatureCard
                title="Post About Projects"
                description="Tweet about your favorite projects and earn recognition"
                icon="📱"
              />
              <FeatureCard
                title="Climb the Leaderboard"
                description="Rank based on post relevance and impressions"
                icon="🏆"
              />
            </div>
          </section>
        </main>

        <footer className="bg-slate-900 text-gray-400 py-8 mt-16">
          <div className="container mx-auto px-4 text-center">
            <p>&copy; 2024 SafuInfoFi. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-slate-800 p-6 rounded-lg text-center">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

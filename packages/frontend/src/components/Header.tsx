import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {
  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white">
          SafuInfoFi
        </Link>

        <div className="hidden md:flex space-x-6">
          <Link
            href="/"
            className="text-gray-300 hover:text-white transition"
          >
            Projects
          </Link>
          <Link
            href="/leaderboards"
            className="text-gray-300 hover:text-white transition"
          >
            Leaderboards
          </Link>
          <Link
            href="/about"
            className="text-gray-300 hover:text-white transition"
          >
            About
          </Link>
        </div>

        <ConnectButton />
      </nav>
    </header>
  );
}

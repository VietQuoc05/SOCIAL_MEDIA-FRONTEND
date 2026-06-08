"use client";

import Link from "next/link";

export default function RootLandingPage() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-black px-6">
      <main className="flex flex-col items-center justify-center gap-8 text-center py-32">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl">
          Welcome to <span className="text-blue-600 dark:text-blue-400">Social Media</span>
        </h1>
        <p className="max-w-xl text-lg text-gray-600 dark:text-gray-400 leading-8">
          Connect, share, and stay in touch with friends and communities. Join us today!
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/login"
            className="rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-gray-300 dark:border-gray-700 px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Create account
          </Link>
        </div>
      </main>
    </div>
  );
}

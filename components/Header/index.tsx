"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const Header = () => {

  // Sticky Navbar
  const [sticky, setSticky] = useState(false);
  const handleStickyNavbar = () => {
    if (window.scrollY >= 80) {
      setSticky(true);
    } else {
      setSticky(false);
    }
  };
  useEffect(() => {
    window.addEventListener("scroll", handleStickyNavbar);
  });


  return (
    <>
      <header
        className={`header left-0 top-0 z-40 flex w-full items-center ${
          sticky
            ? "dark:bg-gray-dark dark:shadow-sticky-dark fixed z-[9999] bg-white !bg-opacity-80 shadow-sticky backdrop-blur-sm transition"
            : "absolute bg-transparent"
        }`}
      >
        <div className="container">
          <div className="relative -mx-4 flex items-center justify-between">
            <div className="w-60 max-w-full px-4 xl:mr-12">
              <Link
                href="/"
                className={`header-logo block w-full ${
                  sticky ? "py-5 lg:py-2" : "py-8"
                } `}
              >
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent dark:text-white">
                  Echos Of Me
                </h1>
              </Link>
            </div>
            <div className="flex w-full items-center justify-end px-4">
              <div className="flex items-center justify-end pr-0 lg:pr-0">
                {/* Mobile Navigation Buttons */}
                <Link
                  href="/auth/signin"
                  className="px-4 py-3 min-h-[48px] text-sm font-medium text-dark hover:opacity-70 dark:text-white md:hidden mr-2 touch-target flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded"
                  aria-label="Sign in to your account"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="ease-in-up shadow-btn hover:shadow-btn-hover rounded-sm bg-primary px-4 py-3 min-h-[48px] text-sm font-medium text-white transition duration-300 hover:bg-opacity-90 md:hidden touch-target flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  aria-label="Begin creating your legacy"
                >
                  Begin Legacy
                </Link>
                
                {/* Desktop Navigation Buttons */}
                <Link
                  href="/auth/signin"
                  className="hidden px-7 py-3 min-h-[48px] text-base font-medium text-dark hover:opacity-70 dark:text-white md:flex items-center touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 rounded"
                  aria-label="Sign in to your account"
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/register"
                  className="ease-in-up shadow-btn hover:shadow-btn-hover hidden rounded-sm bg-primary px-8 py-3 min-h-[48px] text-base font-medium text-white transition duration-300 hover:bg-opacity-90 md:flex items-center touch-target md:px-9 lg:px-6 xl:px-9 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                  aria-label="Begin creating your legacy"
                >
                  Begin Your Legacy
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;

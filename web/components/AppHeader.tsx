"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import UserMenu from "./UserMenu";

interface AppHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  onSettingsClick?: () => void;
}

const AppHeader = ({ showBackButton, onBack, onSettingsClick }: AppHeaderProps) => {
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
            <div className="flex items-center justify-end pr-0 lg:pr-0 gap-4">
              {showBackButton && onBack && (
                <Button variant="ghost" onClick={onBack}>
                  ← Back
                </Button>
              )}
              {onSettingsClick && <UserMenu onSettingsClick={onSettingsClick} />}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
import React from "react";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link";
import Image from "next/image";
import { Button } from "./ui/button";
import { ChevronDown, FileText, GraduationCapIcon,PictureInPicture2 ,LayoutDashboard, PenBox, StarsIcon,BotMessageSquare  } from "lucide-react";
import { checkUser } from "@/lib/checkUser";




async function  Header () {
    await checkUser();
  return (
    <header className="fixed top-0 w-full border-b bg-background/80 backdrop-blur-md z-50 supports-[backdrop-filter]:bg-background/60">
        
        <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/">

            <span className="flex items-center gap-2">
                <Image src="/logo.png" alt="Logo" width={100} height={100} 
                className="h-12 py-1 w-auto object-contain"/>
                <span className="font-bold text-xl text-primary">NextStep</span>
            </span>

          </Link>

            <div className="flex items-center space-x-2 md:space-x-4">

            <SignedIn>
              <Link href="/dashboard">
                <Button variant="outline">
                    <LayoutDashboard className="h-4 w-4"/>
                     <span className="hidden md:block"> Market Analysis </span>  
                </Button>
              </Link>


            <DropdownMenu>
            <DropdownMenuTrigger>
                <Button variant="default">
                    <StarsIcon className="h-4 w-4"/>
                     <span className="hidden md:block"> Tools </span>  
                     <ChevronDown className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>

                <DropdownMenuItem>
                    <Link href={"/resume"} className="flex items-center gap-2">
                        <FileText className="h-4 w-4"/>
                        <span> Build Resume </span>  
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                    <Link href={"/ai-cover-letter"} className="flex items-center gap-2">
                        <PenBox className="h-4 w-4"/>
                        <span> Build Cover Letter </span>  
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                    <Link href={"/mocks"} className="flex items-center gap-2">
                        <GraduationCapIcon className="h-4 w-4"/>
                        <span> Mock Test </span>  
                    </Link>
                </DropdownMenuItem>

                 <DropdownMenuItem>
                    <Link href={"/interview"} className="flex items-center gap-2">
                        <PictureInPicture2  className="h-4 w-4"/>
                        <span>AI Interview Practice</span>  
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem>
                    <Link href={"/chatbot"} className="flex items-center gap-2">
                        <BotMessageSquare  className="h-4 w-4"/>
                        <span>Ai Chatbot</span>  
                    </Link>
                </DropdownMenuItem>

            </DropdownMenuContent>
            </DropdownMenu>

            </SignedIn>


            <SignedOut>
                <SignInButton>
                    <Button variant="outline">Sign In</Button>
                </SignInButton>
            </SignedOut>

            <SignedIn>
                <UserButton  appearance={{
                    elements: {avatarBox:"w-10 h-10",
                            userButtonPopoverCard:"shadow-xl",
                            userPreviewMainIdentifier:"font-semibold",
                    }}} afterSignOutUrl="/"/>
            </SignedIn>

            </div>
        </nav>



        
        
    </header>
  );
}

export default Header;

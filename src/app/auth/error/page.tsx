"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/Button";

export default function ErrorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("An authentication error occurred");

  useEffect(() => {
    const error = searchParams?.get("error");
    if (error) {
      switch (error) {
        case "Configuration":
          setErrorMessage("There's a configuration issue with authentication. Please check environment variables.");
          break;
        case "AccessDenied":
          setErrorMessage("You denied access to your Spotify account.");
          break;
        case "OAuthSignin":
          setErrorMessage("Error starting the sign-in process.");
          break;
        case "OAuthCallback":
          setErrorMessage("Error during the authentication callback.");
          break;
        case "Verification":
          setErrorMessage("Session verification failed. Please try again.");
          break;
        case "CallbackRouteError":
          setErrorMessage("There was a problem with the authentication callback.");
          break;
        default:
          setErrorMessage(`Authentication error: ${error}`);
      }
    }
  }, [searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-purple-900 to-black text-white">
      <div className="p-8 max-w-md w-full bg-purple-800/20 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Authentication Error</h1>

        <div className="mb-6 p-4 bg-red-900/30 rounded-lg">
          <p className="text-center">{errorMessage}</p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            onClick={() => router.push('/auth/signin')}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Try Again
          </Button>

          <Button
            onClick={() => router.push('/')}
            className="w-full bg-transparent border border-purple-600 hover:bg-purple-900/30"
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
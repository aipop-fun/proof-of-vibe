// src/app/api/auth/[...nextauth]/route.ts
import { handlers } from "../../../../auth";

// Export the GET and POST handlers from NextAuth
export const GET = handlers.GET;
export const POST = handlers.POST;
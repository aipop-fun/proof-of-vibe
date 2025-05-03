/* eslint-disable  @typescript-eslint/no-unused-vars */
import { NextRequest } from "next/server";
import { AuthOptions } from "next-auth";
import { authOptions } from "~/auth"; 
import NextAuth from "next-auth/next";


const handler = NextAuth(authOptions);


export { handler as GET, handler as POST };
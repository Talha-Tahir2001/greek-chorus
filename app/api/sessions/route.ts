import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
    
    return new Response(JSON.stringify({ message: "Hello from the sessions API!" }), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    });
}
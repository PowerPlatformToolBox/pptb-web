import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const baseUrl = new URL(request.url);
    const serviceRoot = `${baseUrl.protocol}//${baseUrl.host}/api/odata`;

    const serviceDocument = {
        "@odata.context": `${serviceRoot}/$metadata`,
        value: [
            {
                name: "Tools",
                kind: "EntitySet",
                url: "tools",
            },
        ],
    };

    return new NextResponse(JSON.stringify(serviceDocument), {
        headers: {
            "Content-Type": "application/json;odata.metadata=minimal",
            "OData-Version": "4.0",
        },
    });
}

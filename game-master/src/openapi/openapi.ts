import type { OpenAPIV3_1 } from "openapi-types";

const specs: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: { title: "Game Master API Endpoints", version: "1.0.0", description: "Public endpoints for Game Master service." },
    paths: {
        "/match": {
            get: {
                description: "Get the active match details.",
                security: [
                    {
                        JWT: [],
                    },
                ],
                responses: {
                    200: {
                        description: "Ok.",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        domain: { type: "string" },
                                        subpath: { type: "string" },
                                    },
                                    example: {
                                        domain: "string",
                                        subpath: "string",
                                    },
                                },
                            },
                        },
                    },
                    400: {
                        description: "User doesn't have an active match.",
                    },
                    401: {
                        description: "Unauthorized. Invalid, missing or expired token.",
                    },
                    500: {
                        description: "User does have a match but the information for it doesn't exist.",
                    },
                },
            },
        },
    },
    components: {
        securitySchemes: {
            JWT: {
                type: "http",
                scheme: "bearer",
            },
        },
    },
    tags: [],
};

export function getOpenApiSpecs() {
    return specs;
}

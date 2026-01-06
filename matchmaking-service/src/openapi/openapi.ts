import type { OpenAPIV3_1 } from "openapi-types";

const JWT = [{JWT: []}]

const specs: OpenAPIV3_1.Document = {
    openapi: "3.1.0",
    info: { title: "Game Master API Endpoints", version: "1.0.0", description: "Public endpoints for matchmaking service." },
    paths: {
        "/queue/join": {
            post: {
                description: "Join the matchmaking queue",
                security: JWT,
                responses: {
                    200: {
                        description: "Ok",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: {type: "string"},
                                        userId: {type: "string"},
                                        elO: {type: "number"},
                                        queuePosition: {type: "number"}
                                    },
                                    example: {
                                        message: "string",
                                        userId: "string",
                                        elo: 0,
                                        queuePosition: 0
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized. Invalid, missing or expired token.",
                    },
                    500: {
                        description: "User ID not found in token."
                    }
                }
            }
        },
        "/queue/leave": {
            post: {
                description: "Leave the matchmaking queue",
                security: JWT,
                responses: {
                    200: {
                        description: "Ok",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        message: {type: "string"},
                                        userId: {type: "string"}
                                    },
                                    example: {
                                        message: "string",
                                        userId: "string"
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized. Invalid, missing or expired token.",
                    },
                    500: {
                        description: "User ID not found in token."
                    }
                }
            }
        },
        "/queue/status": {
            get: {
                description: "Get user queue status",
                security: JWT,
                responses: {
                    200: {
                        description: "Ok",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        inQueue: {type: "boolean"},
                                        queuePosition: {type: "number"},
                                        userId: {type: "string"}
                                    },
                                    example: {
                                        inQueue: false,
                                        queuePosition: 0,
                                        userId: "string"
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized. Invalid, missing or expired token.",
                    },
                    404: {
                        description: "User not in queue."
                    },
                    500: {
                        description: "User ID not found in token."
                    }
                }
            }
        },
        "/queue/stats": {
            get: {
                description: "Get queue stats",
                security: JWT,
                responses: {
                    200: {
                        description: "Ok",
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: {
                                        totalPlayersInQueue: {type: "number"},
                                        averageWaitTimeSeconds: {type: "number"}
                                    },
                                    example: {
                                        totalPlayersInQueue: 0,
                                        averageWaitTimeSeconds: 0
                                    }
                                }
                            }
                        }
                    },
                    401: {
                        description: "Unauthorized. Invalid, missing or expired token.",
                    },
                }
            }
        }
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

/*

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
}

*/
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

export const setupSwagger = (app: Express) => {
    const options: swaggerJsdoc.Options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'SupFile API',
                version: '1.0.0',
                description: "Documentation de l'API SupFile pour le projet 4PROJ",
            },
            servers: [
                {
                    url: `${process.env.BACKEND_URL}/api`,
                    description: 'Serveur de développement local',
                },
                {
                    url: 'https://api-supfile.dev-lecomte.fr/api',
                    description: 'Serveur de production',
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                    },
                },
                schemas: {
                    File: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer', example: 1 },
                            name: { type: 'string', example: 'vacances', description: "Nom du fichier SANS l'extension" },
                            extension: { type: 'string', nullable: true, example: 'jpg', description: 'Extension du fichier (sans le point)' },
                            fullName: { type: 'string', example: 'vacances.jpg', description: 'Champ virtuel : Nom complet (name + extension)' },
                            size_bytes: { type: 'integer', format: 'int64', example: 102400 },
                            mime_type: { type: 'string', example: 'application/pdf' },
                            physical_key: { type: 'string', example: 'uuid-physique-sur-disque' },
                            user_id: { type: 'integer', example: 42 },
                            folder_id: { type: 'integer', nullable: true, example: 5 },
                            trashed_at: { type: 'string', format: 'date-time', nullable: true, example: null },
                            deletion_id: { type: 'string', nullable: true, example: null },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    Folder: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer', example: 10 },
                            name: { type: 'string', example: 'Administratif' },
                            user_id: { type: 'integer', example: 42 },
                            parent_id: { type: 'integer', nullable: true, example: 2 },
                            trashed_at: { type: 'string', format: 'date-time', nullable: true },
                            deletion_id: { type: 'string', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                        },
                    },
                    FolderWithPermission: {
                        allOf: [
                            { $ref: '#/components/schemas/Folder' },
                            {
                                type: 'object',
                                properties: {
                                    permission: {
                                        type: 'string',
                                        enum: ['READ', 'WRITE', 'OWNER'],
                                        description: "Niveau d'accès de l'utilisateur sur ce dossier"
                                    }
                                }
                            }
                        ]
                    },
                    FolderContentResponse: {
                        type: 'object',
                        properties: {
                            current: {
                                $ref: '#/components/schemas/FolderWithPermission',
                                nullable: true,
                                description: 'Le dossier actuel (null si racine)'
                            },
                            breadcrumbs: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        id: {
                                            oneOf: [
                                                { type: 'integer' },
                                                { type: 'string' }
                                            ],
                                            nullable: true
                                        },
                                        name: { type: 'string' }
                                    }
                                }
                            },
                            folders: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Folder' }
                            },
                            files: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/File' }
                            }
                        }
                    },
                    Share: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer', example: 1 },
                            owner_id: { type: 'integer', example: 42 },
                            file_id: { type: 'integer', nullable: true, example: 5 },
                            folder_id: { type: 'integer', nullable: true, example: null },
                            recipient_id: { type: 'integer', nullable: true, example: null },
                            token: { type: 'string', nullable: true, example: 'a1b2-c3d4-uuid-token' },
                            expires_at: { type: 'string', format: 'date-time', nullable: true },
                            permission: { type: 'string', enum: ['READ', 'WRITE'], example: 'READ' },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' }
                        }
                    },
                    ShareOwner: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            username: { type: 'string' },
                            email: { type: 'string' }
                        }
                    },
                    SharedFile: {
                        allOf: [
                            { $ref: '#/components/schemas/File' },
                            {
                                type: 'object',
                                properties: {
                                    share_id: { type: 'integer', description: 'ID du lien de partage' },
                                    permission: { type: 'string', enum: ['READ', 'WRITE'] },
                                    owner: { $ref: '#/components/schemas/ShareOwner' }
                                }
                            }
                        ]
                    },
                    SharedFolder: {
                        allOf: [
                            { $ref: '#/components/schemas/Folder' },
                            {
                                type: 'object',
                                properties: {
                                    share_id: { type: 'integer' },
                                    permission: { type: 'string', enum: ['READ', 'WRITE'] },
                                    owner: { $ref: '#/components/schemas/ShareOwner' }
                                }
                            }
                        ]
                    },
                    SharedContentList: {
                        type: 'object',
                        properties: {
                            folders: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/SharedFolder' }
                            },
                            files: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/SharedFile' }
                            }
                        }
                    },
                    SharePublicInput: {
                        type: 'object',
                        properties: {
                            fileId: { type: 'integer', description: 'ID du fichier (optionnel si folderId présent)' },
                            folderId: { type: 'integer', description: 'ID du dossier (optionnel si fileId présent)' },
                            password: { type: 'string', description: 'Mot de passe pour protéger le lien' },
                            expiresAt: { type: 'string', format: 'date-time', description: "Date d'expiration" }
                        }
                    },
                    SharePrivateInput: {
                        type: 'object',
                        required: ['email'],
                        properties: {
                            fileId: { type: 'integer' },
                            folderId: { type: 'integer' },
                            email: { type: 'string', format: 'email', description: "Email de l'utilisateur à inviter" },
                            permission: { type: 'string', enum: ['READ', 'WRITE'], default: 'READ' }
                        }
                    },
                    ShareAccessInput: {
                        type: 'object',
                        properties: {
                            password: {
                                type: 'string',
                                description: 'Mot de passe (requis seulement si le lien est protégé)',
                                example: 'monSuperMotDePasse123'
                            }
                        }
                    },
                    StorageCategoryStats: {
                        type: 'object',
                        properties: {
                            bytes: { type: 'integer', format: 'int64', example: 1073741824 },
                            percent: { type: 'number', format: 'float', example: 3.33 },
                        },
                    },
                    StorageStats: {
                        type: 'object',
                        properties: {
                            quota_bytes: { type: 'integer', format: 'int64', description: 'Quota total en octets', example: 32212254720 },
                            used_bytes: { type: 'integer', format: 'int64', description: 'Espace utilisé en octets', example: 5368709120 },
                            free_bytes: { type: 'integer', format: 'int64', description: 'Espace libre en octets', example: 26843545600 },
                            used_percent: { type: 'number', format: 'float', description: 'Pourcentage du quota utilisé', example: 16.67 },
                            free_percent: { type: 'number', format: 'float', description: 'Pourcentage du quota libre', example: 83.33 },
                            categories: {
                                type: 'object',
                                properties: {
                                    video: { $ref: '#/components/schemas/StorageCategoryStats' },
                                    photo: { $ref: '#/components/schemas/StorageCategoryStats' },
                                    document: { $ref: '#/components/schemas/StorageCategoryStats' },
                                    other: { $ref: '#/components/schemas/StorageCategoryStats' },
                                },
                            },
                        },
                    },
                    PublicContent: {
                        type: 'object',
                        properties: {
                            protected: {
                                type: 'boolean',
                                example: false,
                                description: "Si true et data manquant, un mot de passe est requis"
                            },
                            type: { type: 'string', enum: ['file', 'folder'], example: 'folder' },
                            owner: { type: 'string', example: 'JeanDupont', description: "Nom d'utilisateur du propriétaire" },
                            permission: { type: 'string', enum: ['READ', 'WRITE'], example: 'READ' },
                            data: {
                                oneOf: [
                                    { $ref: '#/components/schemas/File' },
                                    { $ref: '#/components/schemas/Folder' }
                                ]
                            }
                        }
                    }
                },
            },
            security: [{ bearerAuth: [] }],
        },
        apis: [
            process.env.NODE_ENV === 'production'
                ? './dist/routes/*.js'
                : './src/routes/*.ts'
        ],
    };

    const swaggerSpec = swaggerJsdoc(options);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};

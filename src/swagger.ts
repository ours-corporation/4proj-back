import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SupFile API',
            version: '1.0.0',
            description: 'Documentation de l\'API SupFile pour le projet 4PROJ',
        },
        servers: [
            {
                url: 'http://localhost:3001/api', // Ajuste si nécessaire (ex: via process.env)
            },
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
                        name: { type: 'string', example: 'mon_cv.pdf' },
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
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    // Indique où chercher les commentaires @swagger
    apis: ['./src/routes/*.ts'], 
};


const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    // Optionnel : Route JSON pour récupérer la spec brute
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};
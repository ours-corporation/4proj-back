import { Router, Request, Response } from 'express';
import {register, login, refresh, logout, authWithGoogle, authWithGithub} from "../controllers/auth";
import {validate} from "../middleware/validate";
import {loginValidatorSchema, registerValidatorSchema} from "../validator/auth";

const authRouter = Router();


/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Gestion de l'authentification des utilisateurs
 */

/**
 * @swagger
 * /login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Connexion d'un utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 */
authRouter.post('/login', validate(loginValidatorSchema), (req: Request, res: Response) => {
    return login(req, res);
});

/**
 * @swagger
 * /register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Connexion d'un utilisateur
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 */
authRouter.post('/register', validate(registerValidatorSchema), (req: Request, res: Response) => {
    return register(req, res);
});

/**
 * @swagger
 * /refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Rafraîchir le token d'accès
 *     description: Génère un nouveau token d'accès et un nouveau refresh token à partir d'un refresh token valide.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Le refresh token actuel (optionnel si présent en cookie)
 *     responses:
 *       200:
 *         description: Nouveau token généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Nouveau token d'accès
 *       400:
 *         description: Aucun refresh token fourni
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "No refresh token provided"
 *       401:
 *         description: Refresh token invalide
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Invalid refresh token"
 *       500:
 *         description: Erreur interne du serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
    return refresh(req, res);
});

/**
 * @swagger
 * /logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Déconnexion d'un utilisateur
 *     description: Supprime le refresh token côté serveur et nettoie le cookie de refresh token.
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Le refresh token actuel (optionnel si présent en cookie)
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *       500:
 *         description: Erreur interne du serveur
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Internal Server Error"
 */
authRouter.post('/logout', async (req: Request, res: Response) => {
    return logout(req, res);
});

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Authentification via Google (Connexion / Inscription)
 *     description: >
 *       Échange un code d'autorisation Google contre un token.
 *       Crée l'utilisateur ou le connecte, et place le refresh token
 *       en cookie HttpOnly.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Le code d'autorisation retourné par le client Google OAuth (one-time code).
 *     responses:
 *       200:
 *         description: Authentification réussie.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             example: refreshToken=abcde12345; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: Cookie contenant le refresh token sécurisé.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Le token JWT d'accès.
 *       400:
 *         description: Requête invalide (Code manquant).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Authorization code is required
 *       401:
 *         description: Échec de l'authentification Google ou compte invalide.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Échec de l’authentification Google
 *       409:
 *         description: Conflit - L'email existe déjà sans Google.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Un compte avec cet email existe déjà sans Google.
 */
authRouter.post('/auth/google', async (req: Request, res: Response) => {
    return authWithGoogle(req, res);
});

/**
 * @swagger
 * /auth/github:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Authentification via GitHub (Connexion / Inscription)
 *     description: >
 *       Échange un code d'autorisation GitHub contre un token.
 *       Crée l'utilisateur ou le connecte, et place le refresh token
 *       en cookie HttpOnly.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 description: Le code d'autorisation retourné par le client GitHub OAuth (one-time code).
 *     responses:
 *       200:
 *         description: Authentification réussie.
 *         headers:
 *           Set-Cookie:
 *             schema:
 *               type: string
 *             example: refreshToken=abcde12345; Path=/; HttpOnly; Secure; SameSite=Strict
 *             description: Cookie contenant le refresh token sécurisé.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   description: Le token JWT d'accès.
 *       400:
 *         description: Requête invalide (Code manquant).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Authorization code is required
 *       401:
 *         description: Échec de l'authentification GitHub ou compte invalide.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Échec de l'authentification GitHub
 *       409:
 *         description: Conflit - L'email existe déjà sans GitHub.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Un compte avec cet email existe déjà sans GitHub.
 */
authRouter.post('/auth/github', async (req: Request, res: Response) => {
    return authWithGithub(req, res);
});

export default authRouter;

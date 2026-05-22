import { Router, Request, Response } from 'express';
import {register, login, refresh, logout, authWithGoogle, authWithGithub, verifyEmail, resendVerification, forgotPassword, resetPassword} from "../controllers/auth";
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

/**
 * @swagger
 * /verify-email:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Vérification de l'adresse email
 *     description: Valide le token JWT reçu par email et active le compte utilisateur.
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token JWT de vérification (valide 24h)
 *     responses:
 *       200:
 *         description: Email vérifié avec succès ou déjà vérifié.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 already:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Email vérifié avec succès.
 *       400:
 *         description: Token manquant, invalide ou expiré.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token expiré ou invalide.
 *       404:
 *         description: Utilisateur introuvable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Utilisateur introuvable.
 */
authRouter.get('/verify-email', async (req: Request, res: Response) => {
    return verifyEmail(req, res);
});

/**
 * @swagger
 * /resend-verification:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Renvoi de l'email de vérification
 *     description: >
 *       Génère un nouveau token et renvoie l'email de vérification.
 *       La réponse est toujours identique pour éviter l'énumération des comptes.
 *       Sans effet pour les comptes OAuth (Google/GitHub) ou déjà vérifiés.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: utilisateur@exemple.com
 *     responses:
 *       200:
 *         description: Réponse générique (email envoyé ou non, indiscernable).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Si un compte non vérifié existe, un email a été envoyé.
 *       400:
 *         description: Email manquant.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email requis.
 */
authRouter.post('/resend-verification', async (req: Request, res: Response) => {
    return resendVerification(req, res);
});

/**
 * @swagger
 * /forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Demande de réinitialisation du mot de passe
 *     description: >
 *       Envoie un lien de réinitialisation (valable 1h) à l'adresse email fournie.
 *       La réponse est générique pour éviter l'énumération des comptes.
 *       Si le compte est lié à Google ou GitHub (sans mot de passe), retourne `oauthOnly: true`.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: utilisateur@exemple.com
 *     responses:
 *       200:
 *         description: Réponse générique ou indication de compte OAuth.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
 *                 - type: object
 *                   properties:
 *                     oauthOnly:
 *                       type: boolean
 *                       example: true
 *                     provider:
 *                       type: string
 *                       enum: [google, github]
 *                       example: google
 *       400:
 *         description: Email manquant.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email requis.
 */
authRouter.post('/forgot-password', async (req: Request, res: Response) => {
    return forgotPassword(req, res);
});

/**
 * @swagger
 * /reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Réinitialisation du mot de passe
 *     description: >
 *       Valide le token JWT reçu par email, met à jour le mot de passe
 *       et invalide tous les refresh tokens actifs.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - password
 *             properties:
 *               token:
 *                 type: string
 *                 description: Token JWT de réinitialisation (valide 1h)
 *               password:
 *                 type: string
 *                 description: Nouveau mot de passe (min. 8 caractères)
 *                 example: NouveauMotDePasse!42
 *     responses:
 *       200:
 *         description: Mot de passe réinitialisé avec succès.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Mot de passe réinitialisé avec succès.
 *       400:
 *         description: Token manquant, invalide, expiré ou mot de passe trop court.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token expiré ou invalide.
 *       404:
 *         description: Utilisateur introuvable.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Utilisateur introuvable.
 */
authRouter.post('/reset-password', async (req: Request, res: Response) => {
    return resetPassword(req, res);
});

export default authRouter;

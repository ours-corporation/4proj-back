import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    ...(process.env.SMTP_USER && {
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    }),
});

export const sendPasswordResetEmail = async (to: string, resetUrl: string): Promise<void> => {
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: 'Réinitialisation de votre mot de passe — Supfile',
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Réinitialisation du mot de passe</h2>
                <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous :</p>
                <a href="${resetUrl}"
                   style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                          text-decoration:none;border-radius:6px;font-weight:bold;">
                    Réinitialiser mon mot de passe
                </a>
                <p style="margin-top:16px;color:#666;font-size:13px;">
                    Ce lien est valable <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez ce message.
                </p>
                <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
                <p style="color:#aaa;font-size:11px;">
                    Ou copiez ce lien dans votre navigateur :<br/>${resetUrl}
                </p>
            </div>
        `,
    });
};

export const sendVerificationEmail = async (to: string, verificationUrl: string): Promise<void> => {
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject: 'Vérifiez votre adresse email — Supfile',
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Bienvenue sur Supfile !</h2>
                <p>Pour activer votre compte, cliquez sur le bouton ci-dessous :</p>
                <a href="${verificationUrl}"
                   style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;
                          text-decoration:none;border-radius:6px;font-weight:bold;">
                    Vérifier mon email
                </a>
                <p style="margin-top:16px;color:#666;font-size:13px;">
                    Ce lien est valable 24 heures. Si vous n'avez pas créé de compte, ignorez ce message.
                </p>
                <hr style="margin-top:32px;border:none;border-top:1px solid #eee;" />
                <p style="color:#aaa;font-size:11px;">
                    Ou copiez ce lien dans votre navigateur :<br/>${verificationUrl}
                </p>
            </div>
        `,
    });
};

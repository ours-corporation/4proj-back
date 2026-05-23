'use strict';

const bcrypt = require('bcryptjs');

const TEST_PASSWORD = 'Test@123456!';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const now  = new Date();
    const termsDate = new Date('2026-05-01T10:00:00');

    const [quotaRows] = await queryInterface.sequelize.query(
      `SELECT id FROM quota ORDER BY id ASC LIMIT 1`
    );
    if (!quotaRows[0]) throw new Error('Aucun quota en base. Lance d\'abord le seeder de quota.');
    const freeQuotaId = quotaRows[0].id;

    await queryInterface.bulkInsert('users', [
      {
        username:            'alice_test',
        email:               'alice@test.com',
        password:            hash,
        quota_id:            freeQuotaId,
        used_bytes:          0,
        email_verified:      true,
        terms_accepted_at:   termsDate,
        refresh_token:       null,
        google_id:           null,
        github_id:           null,
        profile_picture_key: null,
        created_at:          now,
        updated_at:          now,
      },
      {
        username:            'bob_test',
        email:               'bob@test.com',
        password:            hash,
        quota_id:            freeQuotaId,
        used_bytes:          0,
        email_verified:      true,
        terms_accepted_at:   termsDate,
        refresh_token:       null,
        google_id:           null,
        github_id:           null,
        profile_picture_key: null,
        created_at:          now,
        updated_at:          now,
      },
      {
        username:            'carla_test',
        email:               'carla@test.com',
        password:            hash,
        quota_id:            freeQuotaId,
        used_bytes:          0,
        email_verified:      true,
        terms_accepted_at:   termsDate,
        refresh_token:       null,
        google_id:           null,
        github_id:           null,
        profile_picture_key: null,
        created_at:          now,
        updated_at:          now,
      },
      {
        username:            'david_test',
        email:               'david@test.com',
        password:            hash,
        quota_id:            freeQuotaId,
        used_bytes:          0,
        email_verified:      true,
        terms_accepted_at:   termsDate,
        refresh_token:       null,
        google_id:           null,
        github_id:           null,
        profile_picture_key: null,
        created_at:          now,
        updated_at:          now,
      },
    ]);

    console.log('4 comptes de test créés (mot de passe : Test@123456!)');
    console.log('alice@test.com / bob@test.com / carla@test.com / david@test.com');
  },

  async down() {},
};

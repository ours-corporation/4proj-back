'use strict';
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('files', 'extension', {
      type: Sequelize.STRING,
      allowNull: true, // Certains fichiers n'ont pas d'extension
    });

    const [files] = await queryInterface.sequelize.query("SELECT id, name FROM files");

    for (const file of files) {
      const ext = path.extname(file.name); // Renvoie ".pdf" ou ""
      let nameWithoutExt = file.name;
      let extension = null;

      if (ext) {
        // On enlève le point du début de l'extension (.pdf -> pdf)
        extension = ext.substring(1); 
        // On garde le nom sans l'extension
        nameWithoutExt = path.basename(file.name, ext);
      }

      // Mise à jour de la ligne
      await queryInterface.sequelize.query(
        "UPDATE files SET name = ?, extension = ? WHERE id = ?",
        {
          replacements: [nameWithoutExt, extension, file.id]
        }
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Inverse : on recolle tout dans 'name' avant de supprimer la colonne extension
    const [files] = await queryInterface.sequelize.query("SELECT id, name, extension FROM files");

    for (const file of files) {
      const fullName = file.extension ? `${file.name}.${file.extension}` : file.name;
      await queryInterface.sequelize.query(
        "UPDATE files SET name = ? WHERE id = ?",
        { replacements: [fullName, file.id] }
      );
    }

    await queryInterface.removeColumn('files', 'extension');
  }
};
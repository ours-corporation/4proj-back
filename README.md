# 4proj-back


## Start the project

Développement : 
```bash
  docker-compose up --build
```

Production : 
```bash
  docker-compose up --build
```

## Stop the project

```bash
  docker-compose down
```

## Sequalize CLI

Création d'une migration : (dans le conteneur app)
```bash
  npx sequelize-cli migration:generate --name <nom_de_la_migration>
```

Création d'un seeder : (dans le conteneur app)
```bash
  npx sequelize-cli seed:generate --name <nom_du_seeder>
```

Exécution des migrations : (dans le conteneur app)
```bash
  npx sequelize-cli db:migrate
```

Rollback des migrations : (dans le conteneur app)
```bash
  npx sequelize-cli db:migrate:undo
```

Fresh des migrations : (dans le conteneur app)
```bash
  npx sequelize-cli db:migrate:undo:all
  npx sequelize-cli db:migrate
```

Execution des seeders : (dans le conteneur app)
```bash
  npx sequelize-cli db:seed:all
```
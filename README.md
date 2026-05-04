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

## WebSocket — Synchronisation temps réel

Le serveur expose un endpoint socket.io sur le même port que l'API REST.

### Connexion

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: '<access_token_jwt>' },
});
```

Le token JWT est le même que celui utilisé pour les requêtes HTTP (`Authorization: Bearer ...`). Si le token est invalide ou absent, la connexion est rejetée.

### Événements reçus par le client

| Événement | Payload | Déclencheur |
|---|---|---|
| `file:created` | métadonnées du fichier | upload, copie |
| `file:updated` | métadonnées du fichier | renommage, déplacement |
| `file:trashed` | `{ id }` | mise à la corbeille |
| `file:restored` | métadonnées du fichier | restauration depuis la corbeille |
| `file:deleted` | `{ id }` | suppression définitive |
| `folder:created` | métadonnées du dossier | création, copie |
| `folder:updated` | métadonnées du dossier | renommage |
| `folder:trashed` | `{ id }` | mise à la corbeille |
| `folder:restored` | métadonnées du dossier | restauration depuis la corbeille |
| `folder:deleted` | `{ id }` | suppression définitive |
| `trash:emptied` | `{}` | vidage de la corbeille |
| `items:moved` | `{ items, destination_folder_id }` | déplacement multiple |
| `share:created` | métadonnées du partage | création d'un partage privé (émis vers le propriétaire) |
| `share:received` | métadonnées du partage | création d'un partage privé (émis vers le destinataire) |
| `share:updated` | métadonnées du partage | modification d'un partage |
| `share:revoked` | `{ id }` | suppression d'un partage |
| `storage:updated` | `{ used_bytes }` | après tout upload, copie ou suppression |

### Notes

- Chaque utilisateur reçoit uniquement les événements qui le concernent.
- Les types TypeScript des payloads sont définis dans `src/types/socket-events.ts`.
- Lors d'un partage privé, `share:created` est émis vers le propriétaire et `share:received` vers le destinataire simultanément.
- Socket.io gère les reconnexions automatiquement. Après une longue déconnexion, prévoir un re-fetch de l'état complet côté client car les événements manqués ne sont pas rejoués.

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
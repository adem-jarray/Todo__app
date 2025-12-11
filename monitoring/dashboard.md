# 🐳 Dashboard de Monitoring - Todo App

## 📊 Métriques Collectées via Docker

### 1. Logs d'Application (via `docker logs`)
2024-01-15T10:30:00Z - Application démarrée sur le port 5000
2024-01-15T10:30:02Z - MongoDB connection attempt
2024-01-15T10:30:03Z - GET /todos appelé
2024-01-15T10:30:03Z - GET /todos retourné 0 todos
2024-01-15T10:30:05Z - POST /todos - Todo "Test monitoring" créé

### 2. Utilisation des Ressources (via `docker stats`)
| Métrique | Valeur | Statut |
|----------|--------|--------|
| **CPU Usage** | 0.15% | ✅ Très faible |
| **Memory Usage** | 25.3MiB / 1.94GiB | ✅ Excellent |
| **Network I/O** | 1.23kB / 876B | ✅ Normal |
| **Disk I/O** | 0B / 0B | ✅ Aucune activité |

### 3. Temps d'Exécution Mesurés
- **Démarrage conteneur:** 3.2 secondes
- **Réponse API GET /todos:** 45ms
- **Réponse API POST /todos:** 62ms
- **Commande `docker logs`:** 0.8ms

### 4. Santé du Système
- **Conteneur status:** running ✅
- **Uptime:** 2 minutes 15 secondes
- **Restarts:** 0
- **Exit Code:** 0 (succès)
- **Ports exposés:** 5001:5000/tcp

## 📈 Visualisation des Performances
CPU Usage: [█---------] 0.15% (Idle)
Memory Usage: [█---------] 1.3% (Très bon)
API Response: [██████----] 45ms (Rapide)
Uptime: [██████████] 100% (Stable)


## 🛠️ Commandes de Monitoring Utilisées
```bash
# 1. Collecte des logs
docker logs todo-app-container

# 2. Surveillance ressources
docker stats --no-stream todo-app-container

# 3. Mesure temps d'exécution
time curl -s http://localhost:5001/todos

# 4. Vérification état
docker inspect todo-app-container

🚨 Configuration d'Alerte
CPU > 80% → Notification immédiate

Memory > 85% → Redémarrage automatique

Response time > 1000ms → Avertissement

Container down > 1min → Alerte critique
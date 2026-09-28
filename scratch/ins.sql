INSERT INTO deployment ("deploymentId", title, status, "logPath", "applicationId", "createdAt", description, "startedAt", "finishedAt")
VALUES ('dcava_deploy_v2_5_0', 'Fix: dynamic resolver in nginx.conf y v2.5.0 packs builder', 'done', '/etc/dokploy/logs/cabra-y-curado-mw881a/cabra-y-curado-mw881a-2026-09-27.log', 'EWi_Gjxa1iH9FxZffxE35', '2026-09-27T20:53:00.000Z', 'Commit: 424ae8e0e0608d52a1589a220d616807837b30e3', '2026-09-27T20:52:50.000Z', '2026-09-27T20:53:18.000Z')
ON CONFLICT DO NOTHING;

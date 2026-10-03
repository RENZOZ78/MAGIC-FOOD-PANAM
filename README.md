# MAGIC FOOD PANAM

Site vitrine et de commande en ligne d'un restaurant de restauration rapide à Paris 15e, réalisé en HTML, SCSS/CSS et JavaScript, sans dépendance ni serveur.

## Fonctionnalités

- **Panier réel** : ajout depuis les sections Populaire, Menu, Bannière et Recherche, quantités +/−, suppression, sous-total, frais de livraison (offerts dès 25 €), persistance dans le navigateur, animation « vol vers le panier » et badge compteur.
- **Recherche instantanée** : résultats au fil de la saisie (nom ou catégorie, insensible aux accents), ajout direct au panier, défilement vers le plat mis en évidence.
- **Filtres par catégorie** : chips, cases de catégorie, tags du blog et liens du footer filtrent les plats ; filtre « Favoris ».
- **Favoris** : cœur sur chaque plat, mémorisés dans le navigateur.
- **Compte** : connexion / création de compte simulées avec validation, état connecté, déconnexion, pré-remplissage du nom dans la commande.
- **Commande** : formulaire validé (nom, téléphone, créneau futur, adresse), commande et montant pré-remplis depuis le panier, mode livraison / à emporter, confirmation avec numéro de commande.
- **Newsletter** avec validation d'e-mail, **blog** avec « Lire la suite ».
- **Mode sombre / clair** mémorisé (respecte la préférence système).
- **Effets** : apparition au défilement, header compact translucide, parallaxe et inclinaison 3D dans l'accueil, survols animés, bouton retour en haut avec progression de lecture, notifications toast, menu mobile.
- Accessibilité : boutons réels, libellés ARIA, focus visible, lien d'évitement, `prefers-reduced-motion` respecté.

## Structure

```
index.html        page unique
style.scss        source SCSS (à éditer)
css/style.css     CSS compilé (chargé par la page)
js/script.js      JavaScript
image/            visuels
```

## Compiler le SCSS

Le fichier chargé par la page est `css/style.css`. Après toute modification de `style.scss` :

```bash
npx sass style.scss css/style.css --no-source-map
# ou en continu pendant le développement
npx sass --watch style.scss:css/style.css --no-source-map
```

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier :

```bash
python3 -m http.server 8080
```

puis ouvrir <http://localhost:8080>.

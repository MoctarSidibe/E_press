import { useState } from 'react';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// ─── Legal content ─────────────────────────────────────────────────────────────
const PRIVACY_SECTIONS = [
    {
        heading: '1. Responsable du traitement',
        body: `E-Press SAS, société enregistrée en République Gabonaise, dont le siège social est à Libreville, est le responsable du traitement de vos données personnelles au sens de la Loi n° 001/2011 du 25 septembre 2011 relative à la protection des données à caractère personnel en République Gabonaise.<br><br>Contact : <strong>contact@epress.ga</strong>`,
    },
    {
        heading: '2. Données collectées',
        body: `Lors de la création de votre compte et de l'utilisation de nos services, nous collectons les données suivantes :<br><br>
        <ul>
            <li><strong>Données d'identité :</strong> nom complet, adresse e-mail</li>
            <li><strong>Données de contact :</strong> numéro de téléphone, adresse de collecte et de livraison</li>
            <li><strong>Données d'utilisation :</strong> historique des commandes, préférences de service</li>
            <li><strong>Données de géolocalisation :</strong> uniquement lors de la planification d'une collecte ou livraison, avec votre consentement explicite</li>
            <li><strong>Données financières :</strong> mode de paiement sélectionné (espèces, Mobile Money) — aucun numéro de carte bancaire n'est stocké</li>
        </ul>
        Nous ne collectons que les données strictement nécessaires à l'exécution du service.`,
    },
    {
        heading: '3. Finalités du traitement',
        body: `Vos données sont traitées pour les finalités suivantes :<br><br>
        <ul>
            <li>Création et gestion de votre compte utilisateur</li>
            <li>Prise en charge, suivi et livraison de vos vêtements</li>
            <li>Communication relative à vos commandes (notifications, SMS, e-mails)</li>
            <li>Gestion du programme de fidélité E-Press Points</li>
            <li>Prévention de la fraude et sécurité du service</li>
            <li>Amélioration de nos services et développement de nouvelles fonctionnalités</li>
            <li>Respect de nos obligations légales</li>
        </ul>`,
    },
    {
        heading: '4. Base légale du traitement',
        body: `Conformément à la Loi n° 001/2011, le traitement de vos données repose sur :<br><br>
        <ul>
            <li>Votre <strong>consentement explicite</strong>, exprimé lors de l'inscription</li>
            <li>L'<strong>exécution du contrat</strong> de service liant E-Press et vous</li>
            <li>Le <strong>respect des obligations légales</strong> applicables en République Gabonaise</li>
        </ul>`,
    },
    {
        heading: '5. Destinataires des données',
        body: `Vos données peuvent être transmises à :<br><br>
        <ul>
            <li>Nos <strong>livreurs partenaires</strong> (uniquement : nom, téléphone, adresse de collecte/livraison)</li>
            <li>Nos <strong>laveries partenaires</strong> (uniquement : nature des articles, instructions spéciales)</li>
            <li>Nos <strong>prestataires techniques</strong> hébergeant la plateforme (serveurs sécurisés)</li>
        </ul>
        Nous ne vendons, louons ni cédons jamais vos données à des tiers à des fins commerciales.`,
    },
    {
        heading: '6. Durée de conservation',
        body: `Vos données sont conservées pendant toute la durée de votre relation contractuelle avec E-Press, augmentée d'un délai de <strong>3 ans</strong> à compter de la clôture de votre compte, conformément aux délais légaux de prescription applicables en droit gabonais.<br><br>Les données relatives aux transactions peuvent être conservées jusqu'à <strong>10 ans</strong> pour respecter les obligations comptables et fiscales.`,
    },
    {
        heading: '7. Vos droits',
        body: `Conformément à la Loi n° 001/2011, vous disposez des droits suivants :<br><br>
        <ul>
            <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
            <li><strong>Droit de rectification :</strong> corriger des données inexactes ou incomplètes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de votre compte et de vos données</li>
            <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements</li>
            <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré</li>
        </ul>
        Pour exercer vos droits, contactez-nous à : <strong>contact@epress.ga</strong><br><br>
        Vous pouvez également introduire une réclamation auprès de la <strong>Commission Nationale de Protection des Données Personnelles (CNPDP)</strong> du Gabon.`,
    },
    {
        heading: '8. Sécurité des données',
        body: `E-Press met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :<br><br>
        <ul>
            <li>Chiffrement des communications (HTTPS/TLS)</li>
            <li>Mots de passe stockés sous forme hachée (bcrypt)</li>
            <li>Accès aux données restreint au personnel autorisé</li>
            <li>Audits de sécurité réguliers</li>
        </ul>`,
    },
    {
        heading: '9. Modifications',
        body: `Nous pouvons mettre à jour cette politique à tout moment. En cas de modification substantielle, vous serez informé par notification dans l'application ou par e-mail au moins <strong>15 jours</strong> avant l'entrée en vigueur des changements.`,
    },
];

const TERMS_SECTIONS = [
    {
        heading: '1. Objet',
        body: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation de l'application mobile <strong>E-Press</strong> et de ses services associés, exploités par E-Press SAS, société de droit gabonais.<br><br>En créant un compte, vous acceptez sans réserve les présentes CGU ainsi que notre Politique de Confidentialité.`,
    },
    {
        heading: '2. Description du service',
        body: `E-Press est une plateforme de service de pressing à domicile disponible à Libreville et en République Gabonaise. Le service comprend :<br><br>
        <ul>
            <li>La collecte de vêtements à votre domicile ou adresse indiquée</li>
            <li>Le nettoyage, repassage et entretien par nos laveries partenaires</li>
            <li>La livraison de vos vêtements traités à l'adresse de votre choix</li>
            <li>Un programme de fidélité basé sur un système de points</li>
        </ul>`,
    },
    {
        heading: "3. Conditions d'inscription",
        body: `Pour utiliser E-Press, vous devez :<br><br>
        <ul>
            <li>Être âgé d'au moins <strong>18 ans</strong> ou disposer de l'autorisation d'un représentant légal</li>
            <li>Fournir des informations <strong>exactes, complètes et à jour</strong> lors de l'inscription</li>
            <li>Disposer d'un numéro de téléphone valide en République Gabonaise ou dans un pays compatible</li>
            <li>Ne créer qu'<strong>un seul compte</strong> par personne</li>
        </ul>
        E-Press se réserve le droit de suspendre ou supprimer tout compte dont les informations seraient inexactes ou frauduleuses.`,
    },
    {
        heading: '4. Tarification et paiement',
        body: `Les prix sont exprimés en <strong>Francs CFA (FCFA)</strong> et incluent toutes les taxes applicables en République Gabonaise.<br><br>
        Le barème tarifaire est affiché dans l'application avant toute commande. E-Press se réserve le droit de modifier ses tarifs avec un préavis de 7 jours.<br><br>
        <strong>Modes de paiement acceptés :</strong>
        <ul>
            <li>Espèces (remis au livreur lors de la livraison)</li>
            <li>Mobile Money (Airtel Money, Moov Money)</li>
        </ul>
        Aucun paiement anticipé n'est requis pour les commandes standards.`,
    },
    {
        heading: '5. Collecte et livraison',
        body: `Le délai de traitement standard est de <strong>24 à 72 heures</strong> selon le type de vêtement. Le service express garantit une livraison en moins de <strong>24 heures</strong> (supplément applicable).<br><br>
        L'utilisateur s'engage à :<br>
        <ul>
            <li>Être disponible ou désigner un représentant lors de la collecte/livraison</li>
            <li>S'assurer que les vêtements déposés ne contiennent pas d'objets de valeur</li>
            <li>Signaler tout article fragile dans les instructions spéciales</li>
        </ul>
        E-Press ne saurait être tenu responsable des objets laissés dans les vêtements.`,
    },
    {
        heading: '6. Responsabilité',
        body: `E-Press s'engage à traiter vos vêtements avec le plus grand soin. En cas de dommage avéré causé par notre faute, notre responsabilité est limitée à la valeur raisonnable de l'article, plafonnée à <strong>50 000 FCFA par article</strong>.<br><br>
        Tout litige doit être signalé dans les <strong>48 heures</strong> suivant la livraison, accompagné de photos attestant du dommage.<br><br>
        E-Press décline toute responsabilité pour les dommages préexistants non signalés, les rétrécissements liés aux instructions du fabricant, et les retards liés à des événements de force majeure.`,
    },
    {
        heading: '7. Programme de fidélité E-Press Points',
        body: `Le programme de fidélité permet aux clients d'accumuler des points à chaque commande et de les convertir en réductions.<br><br>
        Les points sont :<br>
        <ul>
            <li>Non cessibles et non remboursables en espèces</li>
            <li>Valables <strong>24 mois</strong> à compter de leur date d'acquisition</li>
            <li>Susceptibles d'être modifiés avec un préavis de 30 jours</li>
        </ul>`,
    },
    {
        heading: "8. Comportement de l'utilisateur",
        body: `L'utilisateur s'interdit :<br><br>
        <ul>
            <li>D'utiliser l'application à des fins illicites ou contraires à l'ordre public gabonais</li>
            <li>De transmettre des contenus diffamatoires ou portant atteinte aux droits de tiers</li>
            <li>De tenter de pirater ou de perturber le fonctionnement de la plateforme</li>
            <li>D'usurper l'identité d'un autre utilisateur</li>
        </ul>
        Tout manquement peut entraîner la suspension immédiate du compte, conformément à la <strong>Loi n° 025/2018</strong> sur la cybercriminalité.`,
    },
    {
        heading: '9. Propriété intellectuelle',
        body: `L'ensemble des éléments de l'application E-Press (logo, nom, design, code source, contenus) sont la propriété exclusive de <strong>E-Press SAS</strong> et sont protégés par le droit gabonais et international de la propriété intellectuelle.<br><br>Toute reproduction ou exploitation non autorisée est strictement interdite.`,
    },
    {
        heading: '10. Résiliation',
        body: `Vous pouvez supprimer votre compte à tout moment depuis votre espace Profil. La suppression entraîne la perte de vos points de fidélité et l'annulation des commandes en cours éligibles.<br><br>E-Press peut résilier votre compte en cas de violation des présentes CGU, après mise en demeure restée sans effet pendant <strong>7 jours</strong>, sauf cas de fraude avérée justifiant une suspension immédiate.`,
    },
    {
        heading: '11. Loi applicable et juridiction',
        body: `Les présentes CGU sont régies par le <strong>droit gabonais</strong> et les textes de l'<strong>OHADA</strong> applicables en République Gabonaise.<br><br>Tout litige sera soumis à la compétence exclusive des <strong>tribunaux de Libreville</strong>, République Gabonaise.<br><br>En cas de litige à la consommation, une tentative de résolution amiable devra être effectuée avant toute action judiciaire.`,
    },
    {
        heading: '12. Contact',
        body: `Pour toute question relative aux présentes CGU :<br><br>
        <strong>E-Press SAS</strong><br>
        Libreville, République Gabonaise<br>
        E-mail : <strong>contact@epress.ga</strong><br>
        Téléphone : <strong>+241 77 00 00 00</strong>`,
    },
];

// ─── HTML generator ────────────────────────────────────────────────────────────
const generateLegalHTML = (date) => {
    const privacy = PRIVACY_SECTIONS.map((s, i) => `
        <div class="section">
            <h3>${s.heading}</h3>
            <div class="section-body">${s.body}</div>
        </div>
    `).join('');

    const terms = TERMS_SECTIONS.map((s, i) => `
        <div class="section">
            <h3>${s.heading}</h3>
            <div class="section-body">${s.body}</div>
        </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  /* ── Reset ── */
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
    color: #1a1f36;
    background: #fff;
    font-size: 13px;
    line-height: 1.7;
  }

  /* ── Page layout ── */
  .page { max-width: 760px; margin: 0 auto; padding: 40px 48px; }

  /* ── Cover header ── */
  .cover {
    background: linear-gradient(135deg, #07101f 0%, #0d1f3c 100%);
    border-radius: 16px;
    padding: 40px 36px 32px;
    margin-bottom: 36px;
    position: relative;
    overflow: hidden;
  }
  .cover::before {
    content: '';
    position: absolute;
    width: 260px; height: 90px;
    background: rgba(0,212,212,0.12);
    border-radius: 6px;
    top: -28px; right: -55px;
    transform: rotate(-32deg);
  }
  .cover::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 3px;
    background: #00D4D4;
    border-radius: 16px 16px 0 0;
  }
  .cover-top {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
  }
  .logo-circle {
    width: 52px; height: 52px;
    border-radius: 14px;
    background: rgba(0,212,212,0.15);
    border: 1px solid rgba(0,212,212,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 26px;
  }
  .brand-name {
    font-size: 32px; font-weight: 900;
    color: #fff; letter-spacing: 0.5px;
  }
  .brand-sub {
    font-size: 12px; color: rgba(255,255,255,0.55);
    letter-spacing: 1px; text-transform: uppercase;
    margin-top: 2px;
  }
  .cover-title {
    font-size: 18px; font-weight: 700;
    color: #fff;
    margin-bottom: 6px;
  }
  .cover-meta {
    display: flex; gap: 24px; flex-wrap: wrap;
  }
  .cover-meta span {
    font-size: 11px; color: rgba(255,255,255,0.5);
  }
  .cover-meta strong { color: rgba(255,255,255,0.8); }
  .teal-pill {
    display: inline-block;
    background: rgba(0,212,212,0.18);
    color: #00D4D4;
    border: 1px solid rgba(0,212,212,0.3);
    border-radius: 20px;
    padding: 3px 12px;
    font-size: 10px; font-weight: 700;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  /* ── Law badge ── */
  .law-badge {
    display: flex; align-items: flex-start; gap: 10px;
    background: rgba(0,212,212,0.08);
    border: 1px solid rgba(0,212,212,0.2);
    border-radius: 10px;
    padding: 12px 16px;
    margin-bottom: 32px;
  }
  .law-icon { font-size: 20px; flex-shrink: 0; }
  .law-text { font-size: 11px; color: #4b5563; line-height: 1.6; }
  .law-text strong { color: #1a1f36; }

  /* ── Document heading ── */
  .doc-header {
    display: flex; align-items: center; gap: 14px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid #00D4D4;
  }
  .doc-icon-box {
    width: 42px; height: 42px; border-radius: 11px;
    background: rgba(0,212,212,0.1);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; flex-shrink: 0;
  }
  .doc-title {
    font-size: 20px; font-weight: 900; color: #1a1f36;
  }
  .doc-updated {
    font-size: 11px; color: #9ca3af; margin-top: 2px;
  }

  /* ── Section ── */
  .section {
    margin-bottom: 22px;
    padding: 18px 20px;
    background: #f9fafb;
    border-radius: 10px;
    border-left: 4px solid #00D4D4;
  }
  .section h3 {
    font-size: 13px; font-weight: 800;
    color: #1a1f36;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.4px;
  }
  .section-body {
    font-size: 12.5px; color: #374151; line-height: 1.75;
  }
  .section-body ul {
    padding-left: 18px; margin-top: 6px;
  }
  .section-body li { margin-bottom: 4px; }

  /* ── Separator ── */
  .doc-separator {
    height: 1px;
    background: linear-gradient(to right, transparent, #e5e7eb, transparent);
    margin: 40px 0;
  }

  /* ── Page break ── */
  .page-break { page-break-before: always; }

  /* ── Signature block ── */
  .signature-block {
    margin-top: 40px;
    padding: 24px;
    border: 2px dashed #d1d5db;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    gap: 40px;
  }
  .sig-col { flex: 1; }
  .sig-label { font-size: 10px; color: #9ca3af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .sig-company { font-size: 13px; font-weight: 800; color: #1a1f36; margin-bottom: 2px; }
  .sig-info { font-size: 11px; color: #6b7280; }
  .sig-line { height: 1px; background: #e5e7eb; margin: 16px 0 8px; }
  .sig-placeholder { font-size: 11px; color: #d1d5db; font-style: italic; }

  /* ── Footer ── */
  .footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  .footer-left { font-size: 11px; color: #9ca3af; }
  .footer-right { font-size: 11px; color: #9ca3af; text-align: right; }
  .footer-teal { color: #00D4D4; font-weight: 700; }
</style>
</head>
<body>
<div class="page">

  <!-- ── COVER ── -->
  <div class="cover">
    <div class="cover-top">
      <div class="logo-circle">💧</div>
      <div>
        <div class="brand-name">E-Press</div>
        <div class="brand-sub">Service de Pressing Premium</div>
      </div>
    </div>
    <div class="teal-pill">Documents légaux officiels</div>
    <div class="cover-title">Politique de Confidentialité &amp;<br>Conditions Générales d'Utilisation</div>
    <div class="cover-meta">
      <span>Mise à jour : <strong>${date}</strong></span>
      <span>Version : <strong>1.0</strong></span>
      <span>Langue : <strong>Français</strong></span>
    </div>
  </div>

  <!-- ── Law notice ── -->
  <div class="law-badge">
    <div class="law-icon">⚖️</div>
    <div class="law-text">
      Ces documents sont conformes à la <strong>Loi n° 001/2011 du 25 septembre 2011</strong> relative à la protection des données à caractère personnel en <strong>République Gabonaise</strong>, aux textes de l'<strong>OHADA</strong>, et à la <strong>Loi n° 025/2018</strong> sur la cybercriminalité. Autorité de contrôle compétente : <strong>Commission Nationale de Protection des Données Personnelles (CNPDP) — Gabon</strong>.
    </div>
  </div>

  <!-- ══════════════════════════════════════════
       DOCUMENT 1 — POLITIQUE DE CONFIDENTIALITÉ
       ══════════════════════════════════════════ -->
  <div class="doc-header">
    <div class="doc-icon-box">🔒</div>
    <div>
      <div class="doc-title">Politique de Confidentialité</div>
      <div class="doc-updated">Dernière mise à jour : ${date} · Applicable en République Gabonaise</div>
    </div>
  </div>

  ${privacy}

  <div class="doc-separator"></div>

  <!-- ══════════════════════════════════════════
       DOCUMENT 2 — CONDITIONS D'UTILISATION
       ══════════════════════════════════════════ -->
  <div class="doc-header page-break">
    <div class="doc-icon-box">📋</div>
    <div>
      <div class="doc-title">Conditions Générales d'Utilisation</div>
      <div class="doc-updated">Dernière mise à jour : ${date} · Applicable en République Gabonaise</div>
    </div>
  </div>

  ${terms}

  <!-- ── Signature block ── -->
  <div class="signature-block">
    <div class="sig-col">
      <div class="sig-label">Émis par</div>
      <div class="sig-company">E-Press SAS</div>
      <div class="sig-info">Libreville, République Gabonaise<br>contact@epress.ga · +241 77 00 00 00</div>
      <div class="sig-line"></div>
      <div class="sig-placeholder">Signature autorisée</div>
    </div>
    <div class="sig-col">
      <div class="sig-label">Document généré le</div>
      <div class="sig-company">${date}</div>
      <div class="sig-info">Ce document est généré automatiquement<br>et constitue la version officielle en vigueur.</div>
      <div class="sig-line"></div>
      <div class="sig-placeholder">Cachet E-Press</div>
    </div>
  </div>

  <!-- ── Footer ── -->
  <div class="footer">
    <div class="footer-left">
      <span class="footer-teal">E-Press</span> · Service de Pressing Premium<br>
      Libreville, République Gabonaise
    </div>
    <div class="footer-right">
      contact@epress.ga<br>
      © ${new Date().getFullYear()} E-Press SAS. Tous droits réservés.
    </div>
  </div>

</div>
</body>
</html>`;
};

// ─── Hook ──────────────────────────────────────────────────────────────────────
export const useLegalPDF = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const downloadLegalPDF = async () => {
        try {
            setIsGenerating(true);

            const date = new Date().toLocaleDateString('fr-FR', {
                day: 'numeric', month: 'long', year: 'numeric',
            });

            const html = generateLegalHTML(date);

            const { uri } = await Print.printToFileAsync({ html, base64: false });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: 'Enregistrer les documents légaux',
                    UTI: 'com.adobe.pdf',
                });
            } else {
                Alert.alert('Indisponible', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
            }
        } catch (error) {
            console.error('Legal PDF Error:', error);
            Alert.alert('Erreur', 'Impossible de générer le PDF. Veuillez réessayer.');
        } finally {
            setIsGenerating(false);
        }
    };

    return { downloadLegalPDF, isGenerating };
};

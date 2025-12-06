/**
 * Composant pour afficher un code d'invitation de manière proéminente
 * Inclut des boutons pour copier, partager et générer un QR code (optionnel)
 */

import React, { useState } from 'react';
import { Copy, Check, Share2, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface InviteCodeDisplayProps {
  code: string;
  groupName?: string;
}

const InviteCodeDisplay: React.FC<InviteCodeDisplayProps> = ({
  code,
  groupName,
}) => {
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copié dans le presse-papiers !', {
        duration: 2000,
        icon: '📋',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Erreur lors de la copie:', err);
      toast.error('Impossible de copier le code', {
        duration: 3000,
      });
    }
  };

  const handleShare = async () => {
    setSharing(true);

    try {
      const shareData: ShareData = {
        title: groupName
          ? `Rejoignez le groupe "${groupName}"`
          : 'Rejoignez mon groupe familial',
        text: groupName
          ? `Rejoignez le groupe "${groupName}" sur BazarKELY avec le code: ${code}`
          : `Rejoignez mon groupe familial sur BazarKELY avec le code: ${code}`,
      };

      // Vérifier si l'API Web Share est disponible
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success('Code partagé avec succès !', {
          duration: 2000,
        });
      } else {
        // Fallback: copier le texte dans le presse-papiers
        const shareText = groupName
          ? `Rejoignez le groupe "${groupName}" sur BazarKELY avec le code: ${code}`
          : `Rejoignez mon groupe familial sur BazarKELY avec le code: ${code}`;
        await navigator.clipboard.writeText(shareText);
        toast.success('Texte de partage copié dans le presse-papiers !', {
          duration: 2000,
          icon: '📋',
        });
      }
    } catch (err: any) {
      // L'utilisateur a annulé le partage
      if (err.name !== 'AbortError') {
        console.error('Erreur lors du partage:', err);
        toast.error('Impossible de partager le code', {
          duration: 3000,
        });
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Code d'invitation */}
      <div className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl">
        <div className="text-center space-y-3">
          {groupName && (
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Users className="w-5 h-5 text-purple-600" />
              <p className="text-sm font-medium text-gray-700">{groupName}</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2 uppercase tracking-wide">
              Code d'invitation
            </label>
            <div className="flex items-center justify-center">
              <code className="text-4xl font-mono font-bold text-purple-700 tracking-widest select-all">
                {code}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        {/* Bouton Copier */}
        <button
          onClick={handleCopy}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 rounded-lg transition-colors font-medium text-gray-700"
        >
          {copied ? (
            <>
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-green-600">Copié !</span>
            </>
          ) : (
            <>
              <Copy className="w-5 h-5 text-purple-600" />
              <span>Copier</span>
            </>
          )}
        </button>

        {/* Bouton Partager */}
        <button
          onClick={handleShare}
          disabled={sharing}
          className="flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sharing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Partage...</span>
            </>
          ) : (
            <>
              <Share2 className="w-5 h-5" />
              <span>Partager</span>
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600 text-center">
          Partagez ce code avec les membres de votre famille pour qu'ils
          rejoignent le groupe. Le code est valide tant que le groupe existe.
        </p>
      </div>
    </div>
  );
};

export default InviteCodeDisplay;


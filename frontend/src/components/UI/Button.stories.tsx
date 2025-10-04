import type { Meta, StoryObj } from '@storybook/react'
import { Check, Plus, Trash2, Download } from 'lucide-react'
import Button from './Button'

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Un composant bouton réutilisable avec plusieurs variants, tailles et états.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost', 'outline', 'link'],
      description: 'Style visuel du bouton',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Taille du bouton',
    },
    loading: {
      control: { type: 'boolean' },
      description: 'Affiche un spinner de chargement',
    },
    disabled: {
      control: { type: 'boolean' },
      description: 'Désactive le bouton',
    },
    fullWidth: {
      control: { type: 'boolean' },
      description: 'Le bouton prend toute la largeur disponible',
    },
    iconPosition: {
      control: { type: 'select' },
      options: ['left', 'right'],
      description: 'Position de l\'icône',
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
  args: {
    children: 'Bouton par défaut',
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Tous les variants de boutons disponibles.',
      },
    },
  },
}

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Différentes tailles de boutons.',
      },
    },
  },
}

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button icon={Plus} iconPosition="left">
        Ajouter
      </Button>
      <Button icon={Download} iconPosition="right">
        Télécharger
      </Button>
      <Button icon={Check} iconPosition="left" variant="success">
        Confirmer
      </Button>
      <Button icon={Trash2} iconPosition="left" variant="danger">
        Supprimer
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Boutons avec icônes à gauche ou à droite.',
      },
    },
  },
}

export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>Normal</Button>
      <Button loading>Chargement</Button>
      <Button disabled>Désactivé</Button>
      <Button fullWidth>Pleine largeur</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Différents états du bouton.',
      },
    },
  },
}

export const Loading: Story = {
  args: {
    children: 'Chargement...',
    loading: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Bouton en état de chargement avec spinner.',
      },
    },
  },
}

export const Disabled: Story = {
  args: {
    children: 'Désactivé',
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Bouton désactivé.',
      },
    },
  },
}

export const FullWidth: Story = {
  args: {
    children: 'Pleine largeur',
    fullWidth: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Bouton qui prend toute la largeur disponible.',
      },
    },
  },
}

export const Interactive: Story = {
  args: {
    children: 'Cliquez-moi',
    onClick: () => alert('Bouton cliqué !'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Bouton interactif avec gestionnaire d\'événement.',
      },
    },
  },
}

export const MadagascarContext: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <Button variant="primary" icon={Plus}>
          Ajouter Transaction
        </Button>
        <Button variant="secondary" icon={Download}>
          Exporter Données
        </Button>
        <Button variant="outline">
          Synchroniser
        </Button>
      </div>
      <div className="text-sm text-gray-600">
        <p>Exemples de boutons dans le contexte de BazarKELY :</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Ajout de transactions (revenus, dépenses, transferts)</li>
          <li>Export des données pour sauvegarde</li>
          <li>Synchronisation multi-navigateurs</li>
          <li>Gestion des budgets et objectifs</li>
        </ul>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Exemples d\'utilisation dans le contexte de BazarKELY PWA.',
      },
    },
  },
}

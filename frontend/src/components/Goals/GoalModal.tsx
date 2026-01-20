import { useState, useEffect } from 'react';
import { Target, Calendar, TrendingUp } from 'lucide-react';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import Input from '../UI/Input';
import type { Goal, GoalFormData } from '../../types';

export interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: GoalFormData) => Promise<void>;
  editingGoal?: Goal | null;
  isLoading?: boolean;
}

const CATEGORY_OPTIONS = [
  { value: 'epargne', label: 'Épargne' },
  { value: 'vacances', label: 'Vacances' },
  { value: 'education', label: 'Éducation' },
  { value: 'urgence', label: 'Urgence' },
  { value: 'achat', label: 'Achat' },
  { value: 'autre', label: 'Autre' }
];

const PRIORITY_OPTIONS: Array<{ value: 'low' | 'medium' | 'high'; label: string }> = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' }
];

const GoalModal: React.FC<GoalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingGoal,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: 0,
    deadline: new Date(),
    category: undefined,
    priority: 'medium'
  });

  const [errors, setErrors] = useState<Partial<Record<keyof GoalFormData, string>>>({});

  // Pre-populate form when editing
  useEffect(() => {
    if (editingGoal) {
      setFormData({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        deadline: editingGoal.deadline instanceof Date 
          ? editingGoal.deadline 
          : new Date(editingGoal.deadline),
        category: editingGoal.category,
        priority: editingGoal.priority
      });
    } else {
      // Reset form for new goal
      setFormData({
        name: '',
        targetAmount: 0,
        deadline: new Date(),
        category: undefined,
        priority: 'medium'
      });
    }
    // Clear errors when modal opens/closes
    setErrors({});
  }, [editingGoal, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof GoalFormData, string>> = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom de l\'objectif est requis';
    }

    // Validate targetAmount
    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Le montant cible doit être supérieur à 0';
    }

    // Validate deadline
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(formData.deadline);
    deadlineDate.setHours(0, 0, 0, 0);
    
    if (deadlineDate <= today) {
      newErrors.deadline = 'La date limite doit être dans le futur';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSave(formData);
      // Form will be reset by useEffect when modal closes
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'objectif:', error);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dateValue = e.target.value;
    if (dateValue) {
      setFormData(prev => ({
        ...prev,
        deadline: new Date(dateValue)
      }));
      // Clear error when user starts typing
      if (errors.deadline) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.deadline;
          return newErrors;
        });
      }
    }
  };

  const modalTitle = editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      size="md"
      closeOnBackdropClick={!isLoading}
      closeOnEsc={!isLoading}
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
          >
            {editingGoal ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div>
          <Input
            label="Nom de l'objectif"
            value={formData.name}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, name: e.target.value }));
              if (errors.name) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.name;
                  return newErrors;
                });
              }
            }}
            error={errors.name}
            leftIcon={Target}
            required
            placeholder="Ex: Voyage à Paris"
          />
        </div>

        {/* Target Amount Field */}
        <div>
          <Input
            label="Montant cible"
            type="number"
            value={formData.targetAmount || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0;
              setFormData(prev => ({ ...prev, targetAmount: value }));
              if (errors.targetAmount) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.targetAmount;
                  return newErrors;
                });
              }
            }}
            error={errors.targetAmount}
            leftIcon={TrendingUp}
            required
            min="0"
            step="1000"
            placeholder="0"
          />
          <p className="text-xs text-gray-500 mt-1">Montant en Ariary (Ar)</p>
        </div>

        {/* Deadline Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date limite <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="date"
              value={formatDateForInput(formData.deadline)}
              onChange={handleDateChange}
              min={formatDateForInput(new Date())}
              className={`block w-full pl-10 pr-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
                errors.deadline
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                  : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
              }`}
              required
            />
          </div>
          {errors.deadline && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.deadline}
            </p>
          )}
        </div>

        {/* Category Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Catégorie
          </label>
          <select
            value={formData.category || ''}
            onChange={(e) => {
              setFormData(prev => ({
                ...prev,
                category: e.target.value || undefined
              }));
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">Sélectionner une catégorie</option>
            {CATEGORY_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Priority Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priorité <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-col space-y-2">
            {PRIORITY_OPTIONS.map(option => (
              <label
                key={option.value}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
              >
                <input
                  type="radio"
                  name="priority"
                  value={option.value}
                  checked={formData.priority === option.value}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      priority: e.target.value as 'low' | 'medium' | 'high'
                    }));
                  }}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default GoalModal;





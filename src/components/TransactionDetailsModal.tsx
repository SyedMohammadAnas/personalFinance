'use client';

import { useState, useEffect } from 'react';
import { Pencil, Save, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';

// Transaction type
interface Transaction {
  id: string;
  email_id: string;
  amount: number;
  name: string;
  date: string;
  time: string;
  transaction_type: string;
  created_at: string;
}

interface TransactionDetailsModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdated: () => void;
}

export default function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  onTransactionUpdated
}: TransactionDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize new name when transaction changes
  useEffect(() => {
    if (transaction) {
      setNewName(transaction.name);
      // Reset editing state when transaction changes
      setIsEditing(false);
      setError(null);
    }
  }, [transaction]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time
  const formatTime = (timeStr: string) => {
    // Assume time is in HH:MM:SS format
    const timeParts = timeStr.split(':');
    if (timeParts.length >= 2) {
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    }
    return timeStr;
  };

  // Handle save button click
  const handleSave = async () => {
    if (!transaction) return;

    // Validate the name before sending
    if (!newName || newName.trim() === '') {
      setError('Transaction name cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      console.log(`Updating transaction ${transaction.id} with new name: "${newName}"`);

      const response = await fetch('/api/transactions/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          name: newName
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transaction');
      }

      console.log(`Transaction updated successfully:`, result);

      // Exit edit mode
      setIsEditing(false);

      // Wait for a brief moment before notifying parent to ensure state updates propagate
      setTimeout(() => {
        // Notify parent component to refresh data
        onTransactionUpdated();
        console.log('Notified parent component to refresh transactions');
      }, 300);
    } catch (err) {
      console.error('Error updating transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to update transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state when dialog is closed
  const handleDialogClose = () => {
    setIsEditing(false);
    setError(null);
    onClose();
  };

  if (!transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Transaction Details</span>
            <div className="flex items-center gap-2">
              <div className={`text-sm font-medium ${
                transaction.transaction_type === 'credited'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {transaction.transaction_type === 'credited' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-1 mt-2">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Transaction ID:</span>
              <span className="text-sm text-gray-300">{transaction.id.slice(0, 8)}...</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Type:</span>
              <div className="flex items-center">
                <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center mr-2">
                  {transaction.transaction_type === 'credited' ? (
                    <ArrowDownLeft className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>
                <span className="text-sm text-gray-300 capitalize">
                  {transaction.transaction_type}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Name:</span>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="h-8 w-[200px] bg-gray-800 border-gray-700 text-gray-200"
                  />
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="h-8 px-2 bg-blue-600 hover:bg-blue-700"
                  >
                    {isSubmitting ? (
                      <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{transaction.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNewName(transaction.name);
                      setIsEditing(true);
                    }}
                    className="h-6 w-6 p-0"
                  >
                    <Pencil className="h-3.5 w-3.5 text-gray-400" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Date:</span>
              <span className="text-sm text-gray-300">{formatDate(transaction.date)}</span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-400">Time:</span>
              <span className="text-sm text-gray-300">{formatTime(transaction.time)}</span>
            </div>
          </div>

          {error && (
            <div className="mt-2 p-2 bg-red-900/30 border border-red-800 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleDialogClose}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

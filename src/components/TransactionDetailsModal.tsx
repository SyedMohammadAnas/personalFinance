'use client';

import { useState, useEffect } from 'react';
import { Pencil, Save, ArrowUpRight, ArrowDownLeft, Check, ChevronsUpDown, Tag } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  description?: string;
  tag?: string;
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
  const [isNoteEditing, setIsNoteEditing] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [isTagUpdating, setIsTagUpdating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNoteSaving, setIsNoteSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available tag options
  const tagOptions = ["Food", "Travel", "Entertainment", "Shopping", "Others"];

  // Initialize new name, note, and tag when transaction changes
  useEffect(() => {
    if (transaction) {
      setNewName(transaction.name);
      setNewNote(transaction.description || '');
      setSelectedTag(transaction.tag || '');
      // Reset editing states when transaction changes
      setIsEditing(false);
      setIsNoteEditing(false);
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

  // Handle save note button click
  const handleSaveNote = async () => {
    if (!transaction) return;

    try {
      setIsNoteSaving(true);
      setError(null);

      console.log(`Updating transaction ${transaction.id} with new description: "${newNote}"`);

      const response = await fetch('/api/transactions/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          description: newNote.trim()
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transaction note');
      }

      console.log(`Transaction note updated successfully:`, result);

      // Exit note edit mode
      setIsNoteEditing(false);

      // Wait for a brief moment before notifying parent to ensure state updates propagate
      setTimeout(() => {
        // Notify parent component to refresh data
        onTransactionUpdated();
        console.log('Notified parent component to refresh transactions after note update');
      }, 300);
    } catch (err) {
      console.error('Error updating transaction note:', err);
      setError(err instanceof Error ? err.message : 'Failed to update transaction note');
    } finally {
      setIsNoteSaving(false);
    }
  };

  // Handle tag selection
  const handleTagSelect = async (tag: string) => {
    if (!transaction || tag === transaction.tag) return;

    try {
      setIsTagUpdating(true);
      setError(null);

      console.log(`Updating transaction ${transaction.id} with new tag: "${tag}"`);

      const response = await fetch('/api/transactions/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transactionId: transaction.id,
          tag: tag
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update transaction tag');
      }

      console.log(`Transaction tag updated successfully:`, result);
      setSelectedTag(tag);

      // Wait for a brief moment before notifying parent to ensure state updates propagate
      setTimeout(() => {
        // Notify parent component to refresh data
        onTransactionUpdated();
        console.log('Notified parent component to refresh transactions after tag update');
      }, 300);
    } catch (err) {
      console.error('Error updating transaction tag:', err);
      setError(err instanceof Error ? err.message : 'Failed to update transaction tag');
    } finally {
      setIsTagUpdating(false);
    }
  };

  // Reset state when dialog is closed
  const handleDialogClose = () => {
    setIsEditing(false);
    setIsNoteEditing(false);
    setError(null);
    onClose();
  };

  if (!transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-start justify-between text-xl mb-2 pr-6">
            <span>Transaction Details</span>
            <div className="flex items-center mr-6">
              <div className={`text-base font-medium ${
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

        <div className="p-4 mt-2 space-y-6 bg-gray-900/50 rounded-lg">
          <div className="grid grid-cols-1 gap-6">
            {/* Transaction Name - Editable */}
            <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Name:</span>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-9 w-[240px] bg-gray-800 border-gray-700 text-gray-200"
                    />
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className="h-9 px-3 bg-blue-600 hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
                      ) : (
                        <Save className="h-4 w-4 mr-1" />
                      )}
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-medium">{transaction.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNewName(transaction.name);
                        setIsEditing(true);
                      }}
                      className="h-7 w-7 p-0 hover:bg-gray-800"
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction ID */}
            <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Transaction ID:</span>
                <span className="text-sm text-gray-300">{transaction.id.slice(0, 8)}...</span>
              </div>
            </div>

            {/* Transaction Type */}
            <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Type:</span>
                <div className="flex items-center">
                  <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center mr-2">
                    {transaction.transaction_type === 'credited' ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-400" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-400" />
                    )}
                  </div>
                  <span className="text-sm text-gray-300 capitalize">
                    {transaction.transaction_type}
                  </span>
                </div>
              </div>
            </div>

            {/* Transaction Tag - Dropdown */}
            <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Tag:</span>
                <div className="flex items-center">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`h-8 gap-1 border-gray-700 ${selectedTag ? 'text-white' : 'text-gray-400'} hover:bg-gray-800`}
                        disabled={isTagUpdating}
                      >
                        {isTagUpdating ? (
                          <div className="h-3.5 w-3.5 border-2 border-t-transparent border-current rounded-full animate-spin mr-1" />
                        ) : (
                          <Tag className="h-3.5 w-3.5 mr-1" />
                        )}
                        {selectedTag || 'Select tag'}
                        <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700 text-gray-200">
                      {tagOptions.map((tag) => (
                        <DropdownMenuItem
                          key={tag}
                          onClick={() => handleTagSelect(tag)}
                          className={`flex items-center cursor-pointer hover:bg-gray-800 ${selectedTag === tag ? 'text-blue-400' : ''}`}
                        >
                          {selectedTag === tag && <Check className="h-3.5 w-3.5 mr-2" />}
                          <span className={selectedTag === tag ? 'ml-0' : 'ml-5.5'}>
                            {tag}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Transaction Note - Editable */}
            <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Note:</span>
                  {isNoteEditing && (
                    <Button
                      size="sm"
                      onClick={handleSaveNote}
                      disabled={isNoteSaving}
                      className="h-7 px-2 bg-blue-600 hover:bg-blue-700"
                    >
                      {isNoteSaving ? (
                        <div className="h-3.5 w-3.5 border-2 border-t-transparent border-white rounded-full animate-spin mr-1" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="relative w-full">
                  <textarea
                    value={newNote}
                    onChange={(e) => {
                      setNewNote(e.target.value);
                      if (!isNoteEditing) setIsNoteEditing(true);
                    }}
                    onFocus={() => setIsNoteEditing(true)}
                    placeholder="Add a note about this transaction..."
                    className="w-full min-h-[80px] rounded p-2 bg-gray-800 border border-gray-700 text-gray-200 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Date and Time Group */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-400 mb-1">Date:</span>
                  <span className="text-sm text-gray-300">{formatDate(transaction.date)}</span>
                </div>
              </div>

              {/* Time */}
              <div className="p-3 bg-gray-900 rounded-md border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-400 mb-1">Time:</span>
                  <span className="text-sm text-gray-300">{formatTime(transaction.time)}</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-md">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleDialogClose}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-5 py-2"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

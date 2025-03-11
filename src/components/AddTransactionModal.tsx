'use client';

import { useState, useEffect } from 'react';
import { Pencil, Save, ArrowUpRight, ArrowDownLeft, Check, ChevronsUpDown, Tag, Plus } from 'lucide-react';
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
import { createClient } from '@supabase/supabase-js';
import { useSession } from 'next-auth/react';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionAdded: () => void;
}

export default function AddTransactionModal({
  isOpen,
  onClose,
  onTransactionAdded
}: AddTransactionModalProps) {
  const { data: session } = useSession();
  const [transactionName, setTransactionName] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState('debited');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Available tag options
  const tagOptions = ["Food", "Travel", "Entertainment", "Shopping", "Others"];

  // Format date for display
  const todayDate = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Initialize dates when modal opens
  useEffect(() => {
    setDate(todayDate);
    setTime(currentTime);
  }, [isOpen]);

  // Handle dialog close
  const handleDialogClose = () => {
    resetForm();
    onClose();
  };

  // Reset form
  const handleReset = () => {
    resetForm();
  };

  // Reset form fields
  const resetForm = () => {
    setTransactionName('');
    setTransactionAmount('');
    setTransactionType('debited');
    setSelectedTag('');
    setNote('');
    setDate(todayDate);
    setTime(currentTime);
    setError(null);
  };

  // Handle form submission
  const handleSave = async () => {
    // Validate inputs
    if (!transactionName) {
      setError('Transaction name is required');
      return;
    }

    if (!transactionAmount || isNaN(parseFloat(transactionAmount)) || parseFloat(transactionAmount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!date) {
      setError('Date is required');
      return;
    }

    if (!time) {
      setError('Time is required');
      return;
    }

    if (!session?.user?.email) {
      setError('You must be logged in to add transactions');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Get table name based on user email
      const safeEmail = session.user.email.toLowerCase().replace(/[@.]/g, '_');
      const tableName = `transactions_${safeEmail}`;

      // Create new transaction object
      const newTransaction = {
        // user_id and email_id are intentionally omitted for manual transactions
        // This requires running the SQL script to make these fields nullable in the database
        name: transactionName.trim(),
        amount: parseFloat(transactionAmount),
        date: date,
        time: time,
        transaction_type: transactionType,
        tag: selectedTag || null,
        description: note.trim() || null,
      };

      console.log('Adding new transaction:', newTransaction);

      // Insert into Supabase
      const { data, error: supabaseError } = await supabase
        .from(tableName)
        .insert([newTransaction])
        .select();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      console.log('Transaction added successfully:', data);

      // Close modal and reset form
      resetForm();
      onTransactionAdded();
      onClose();
    } catch (err) {
      console.error('Error adding transaction:', err);
      setError(err instanceof Error ? err.message : 'Failed to add transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-[#111827]/90 backdrop-blur-md border-gray-800">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-start justify-between text-2xl mb-2 pr-6">
            <span>Add Transaction</span>
            <div className="flex items-center mr-6">
              <div className={`text-base font-medium ${
                transactionType === 'credited'
                  ? 'text-green-400'
                  : 'text-red-400'
              }`}>
                {transactionType === 'credited' ? '+' : '-'}
                {transactionAmount ? `₹${parseFloat(transactionAmount).toFixed(2)}` : '₹0.00'}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 mt-2 space-y-0 bg-[#0E1525] rounded-lg">
          <div className="flex flex-col gap-5">
            {/* Tag Dropdown */}
            <div className="relative right-[10px] px-3 py-2 z-10">
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-7 px-2.5 gap-1 border-gray-700 ${selectedTag ? 'text-white' : 'text-gray-400'} hover:bg-gray-800 bg-[#111827] shadow-sm`}
                    >
                      <Tag className=" h-3.5 w-3.5" />
                      {selectedTag || 'Select tag'}
                      <ChevronsUpDown className="h-3.5 w-3.5 ml-1 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-gray-900 border-gray-700 text-gray-200">
                    {tagOptions.map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => setSelectedTag(tag)}
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

            {/* Transaction Name */}
            <div className="p-4 bg-[#111827] rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Name:</span>
                <Input
                  value={transactionName}
                  onChange={(e) => setTransactionName(e.target.value)}
                  placeholder="Transaction name"
                  className="h-9 w-[240px] bg-[#1A2333] border-gray-700 text-gray-200"
                />
              </div>
            </div>

            {/* Transaction Amount */}
            <div className="p-4 bg-[#111827] rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Amount:</span>
                <Input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-9 w-[240px] bg-[#1A2333] border-gray-700 text-gray-200"
                />
              </div>
            </div>

            {/* Transaction Type */}
            <div className="p-4 bg-[#111827] rounded-md border border-gray-800">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">Type:</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="debited"
                      name="transaction_type"
                      value="debited"
                      checked={transactionType === 'debited'}
                      onChange={() => setTransactionType('debited')}
                      className="h-4 w-4 accent-red-400 bg-gray-800"
                    />
                    <label htmlFor="debited" className="flex items-center text-sm text-gray-300">
                      <ArrowUpRight className="h-4 w-4 text-red-400 mr-1" />
                      Debited
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="credited"
                      name="transaction_type"
                      value="credited"
                      checked={transactionType === 'credited'}
                      onChange={() => setTransactionType('credited')}
                      className="h-4 w-4 accent-green-400 bg-gray-800"
                    />
                    <label htmlFor="credited" className="flex items-center text-sm text-gray-300">
                      <ArrowDownLeft className="h-4 w-4 text-green-400 mr-1" />
                      Credited
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Transaction Note */}
            <div className="p-4 bg-[#111827] rounded-md border border-gray-800">
              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-400">Note:</span>
                </div>
                <div className="relative w-full">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Add a note about this transaction (optional)"
                    className="mt-2 w-full p-2 text-base rounded-md bg-gray-800 border border-gray-700 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Date and Time Group */}
            <div className="grid grid-cols-2 gap-4">
              {/* Date */}
              <div className="p-4 bg-[#111827] rounded-md border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-400 mb-1">Date:</span>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-9 bg-[#1A2333] border-gray-700 text-gray-200"
                  />
                </div>
              </div>

              {/* Time */}
              <div className="p-4 bg-[#111827] rounded-md border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-400 mb-1">Time:</span>
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-9 bg-[#1A2333] border-gray-700 text-gray-200"
                  />
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

        <DialogFooter className="mt-4 flex justify-between items-center">
          <Button
            type="button"
            onClick={handleReset}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-4 py-2"
          >
            Reset
          </Button>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="default"
              onClick={handleSave}
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin mr-2" />
              ) : null}
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDialogClose}
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white px-4 py-2"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AddTransactionButton({ onTransactionAdded }: { onTransactionAdded: () => void }) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsAddModalOpen(true)}
        className="h-8 px-3 gap-1 border-gray-700 text-white hover:bg-gray-800 bg-[#111827]"
      >
        <Plus className="h-3.5 w-3.5 mr-1" />
        Add Transaction
      </Button>

      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTransactionAdded={onTransactionAdded}
      />
    </>
  );
}

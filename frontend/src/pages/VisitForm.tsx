import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import StepIndicator from '../components/StepIndicator';
import {
  getMandals, submitVisit, getVisitById, getVisitsByPhone,
  updateVisitPublic, cancelVisit
} from '../services/api';
import type { VisitRequest, MealPlan } from '../types';
import {
  MapPin, User, Phone, Users, Calendar, Clock, ChevronRight, ChevronLeft,
  Check, AlertCircle, Search, X, Baby, HeartHandshake, FileText, Send
} from 'lucide-react';

const steps = [
  { title: 'Visit Details', description: 'Basic visit information' },
  { title: 'Meal Planning', description: 'Day-wise meal selection' },
  { title: 'Additional Info', description: 'Extra details & notes' },
];

const defaultForm: VisitRequest = {
  mandalName: '',
  representativeName: '',
  representativePhone: '',
  numberOfRepresentatives: 1,
  fromDate: '',
  toDate: '',
  arrivalTime: '',
  totalVisitors: 1,
  mealPlans: [],
  numberOfKids: 0,
  numberOfElderly: 0,
  specialRequirements: '',
  notes: '',
};

const VisitForm: React.FC = () => {
  const { visitId } = useParams();
  const [searchParams] = useSearchParams();
  const editMode = !!visitId;

  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<VisitRequest>({ ...defaultForm });
  const [mandals, setMandals] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resultId, setResultId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  // Lookup state
  const [showLookup, setShowLookup] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupResults, setLookupResults] = useState<VisitRequest[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    getMandals().then(res => setMandals(res.data)).catch(() => {});

    if (editMode && visitId) {
      getVisitById(visitId).then(res => {
        setForm(res.data);
      }).catch(() => {
        setError('Visit not found');
      });
    }
  }, [editMode, visitId]);

  // Generate meal plan rows when dates change
  useEffect(() => {
    if (form.fromDate && form.toDate) {
      const from = new Date(form.fromDate);
      const to = new Date(form.toDate);
      if (from <= to) {
        const days: MealPlan[] = [];
        const current = new Date(from);
        while (current <= to) {
          const dateStr = current.toISOString().split('T')[0];
          const existing = form.mealPlans.find(m => m.date === dateStr);
          days.push(existing || {
            date: dateStr,
            breakfastRequired: false,
            breakfastCount: 0,
            lunchRequired: false,
            lunchCount: 0,
            dinnerRequired: false,
            dinnerCount: 0,
          });
          current.setDate(current.getDate() + 1);
        }
        setForm(prev => ({ ...prev, mealPlans: days }));
      }
    }
  }, [form.fromDate, form.toDate]);

  const numberOfDays = (() => {
    if (!form.fromDate || !form.toDate) return 0;
    const from = new Date(form.fromDate);
    const to = new Date(form.toDate);
    return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  })();

  const updateField = (field: keyof VisitRequest, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateMeal = (index: number, field: keyof MealPlan, value: any) => {
    setForm(prev => {
      const meals = [...prev.mealPlans];
      meals[index] = { ...meals[index], [field]: value };
      // Auto-set count when toggling required
      if (field === 'breakfastRequired' && value === true && meals[index].breakfastCount === 0) {
        meals[index].breakfastCount = prev.totalVisitors;
      }
      if (field === 'lunchRequired' && value === true && meals[index].lunchCount === 0) {
        meals[index].lunchCount = prev.totalVisitors;
      }
      if (field === 'dinnerRequired' && value === true && meals[index].dinnerCount === 0) {
        meals[index].dinnerCount = prev.totalVisitors;
      }
      return { ...prev, mealPlans: meals };
    });
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!form.mandalName) newErrors.mandalName = 'Mandal is required';
      if (!form.representativeName) newErrors.representativeName = 'Name is required';
      if (!form.representativePhone) newErrors.representativePhone = 'Phone is required';
      else if (!/^[0-9]{10}$/.test(form.representativePhone)) newErrors.representativePhone = 'Must be 10 digits';
      if (!form.fromDate) newErrors.fromDate = 'Required';
      if (!form.toDate) newErrors.toDate = 'Required';
      if (form.fromDate && form.toDate && new Date(form.fromDate) > new Date(form.toDate)) {
        newErrors.toDate = 'Must be after From date';
      }
      if (form.totalVisitors < 1) newErrors.totalVisitors = 'At least 1 visitor';
    }

    if (step === 1) {
      form.mealPlans.forEach((meal, i) => {
        if (meal.breakfastRequired && meal.breakfastCount > form.totalVisitors) {
          newErrors[`breakfast_${i}`] = `Max ${form.totalVisitors}`;
        }
        if (meal.lunchRequired && meal.lunchCount > form.totalVisitors) {
          newErrors[`lunch_${i}`] = `Max ${form.totalVisitors}`;
        }
        if (meal.dinnerRequired && meal.dinnerCount > form.totalVisitors) {
          newErrors[`dinner_${i}`] = `Max ${form.totalVisitors}`;
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setLoading(true);
    setError('');
    try {
      if (editMode && visitId) {
        await updateVisitPublic(visitId, form);
        setResultId(visitId);
      } else {
        const res = await submitVisit(form);
        setResultId(res.data.visitId);
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLookup = async () => {
    if (!lookupPhone || lookupPhone.length !== 10) return;
    setLookupLoading(true);
    try {
      const res = await getVisitsByPhone(lookupPhone);
      setLookupResults(res.data);
    } catch (err) {
      console.error('Lookup failed', err);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCancel = async (vId: string) => {
    try {
      await cancelVisit(vId, lookupPhone);
      handleLookup();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cancel failed');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {editMode ? 'Visit Updated!' : 'Visit Submitted!'}
          </h2>
          <p className="text-slate-500 text-sm mb-4">
            Your visit request has been {editMode ? 'updated' : 'submitted'} successfully.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <p className="text-xs text-slate-400">Your Visit ID</p>
            <p className="text-lg font-bold text-amber-600 mt-1">{resultId}</p>
            <p className="text-xs text-slate-400 mt-2">Save this ID to edit or cancel your visit later.</p>
          </div>
          <button
            onClick={() => { setSubmitted(false); setForm({ ...defaultForm }); setCurrentStep(0); }}
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-md transition-all"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-8">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-xl mb-4">
            <span className="text-2xl">🛕</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Temple Visit Request</h1>
          <p className="text-slate-400 text-sm">Fill in the details to plan your temple visit</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Lookup Toggle */}
        <div className="flex justify-end mb-4 gap-2">
          <button
            onClick={() => setShowLookup(!showLookup)}
            className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
          >
            <Search size={14} />
            {showLookup ? 'Hide Lookup' : 'Edit/Cancel Existing Visit'}
          </button>
        </div>

        {/* Lookup Panel */}
        {showLookup && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Find Your Visit</h3>
            <div className="flex gap-2 mb-4">
              <input
                type="tel"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter your 10-digit phone number"
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              />
              <button
                onClick={handleLookup}
                disabled={lookupLoading || lookupPhone.length !== 10}
                className="px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                {lookupLoading ? '...' : 'Search'}
              </button>
            </div>

            {lookupResults.length > 0 && (
              <div className="space-y-2">
                {lookupResults.map(v => (
                  <div key={v.visitId} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-medium">{v.mandalName} • {v.fromDate} to {v.toDate}</p>
                      <p className="text-xs text-slate-500">ID: {v.visitId} • Status: {v.status}</p>
                    </div>
                    <div className="flex gap-1">
                      {v.status !== 'CANCELLED' && (
                        <>
                          <a
                            href={`/visit/${v.visitId}`}
                            className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-medium hover:bg-blue-600"
                          >
                            Edit
                          </a>
                          <button
                            onClick={() => handleCancel(v.visitId!)}
                            className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {lookupResults.length === 0 && lookupPhone.length === 10 && !lookupLoading && (
              <p className="text-sm text-slate-400 text-center py-2">No visits found for this phone number</p>
            )}
          </div>
        )}

        {/* Step Indicator */}
        <StepIndicator steps={steps} currentStep={currentStep} />

        {/* Error Banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          {/* Step 1: Visit Details */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <MapPin size={20} className="text-amber-500" /> Visit Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Mandal Name *</label>
                <select
                  value={form.mandalName}
                  onChange={(e) => updateField('mandalName', e.target.value)}
                  className={`w-full px-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                    errors.mandalName ? 'border-red-300' : 'border-slate-200'
                  }`}
                >
                  <option value="">Select Mandal</option>
                  {mandals.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {errors.mandalName && <p className="text-xs text-red-500 mt-1">{errors.mandalName}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Representative Name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.representativeName}
                      onChange={(e) => updateField('representativeName', e.target.value)}
                      placeholder="Full name"
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        errors.representativeName ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.representativeName && <p className="text-xs text-red-500 mt-1">{errors.representativeName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number *</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      value={form.representativePhone}
                      onChange={(e) => updateField('representativePhone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        errors.representativePhone ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.representativePhone && <p className="text-xs text-red-500 mt-1">{errors.representativePhone}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Visitors *</label>
                <div className="relative">
                  <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="number"
                    min={1}
                    value={form.totalVisitors}
                    onChange={(e) => updateField('totalVisitors', parseInt(e.target.value) || 1)}
                    className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                      errors.totalVisitors ? 'border-red-300' : 'border-slate-200'
                    }`}
                  />
                </div>
                {errors.totalVisitors && <p className="text-xs text-red-500 mt-1">{errors.totalVisitors}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">From Date *</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.fromDate}
                      onChange={(e) => updateField('fromDate', e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        errors.fromDate ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.fromDate && <p className="text-xs text-red-500 mt-1">{errors.fromDate}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">To Date *</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={form.toDate}
                      onChange={(e) => updateField('toDate', e.target.value)}
                      className={`w-full pl-9 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                        errors.toDate ? 'border-red-300' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {errors.toDate && <p className="text-xs text-red-500 mt-1">{errors.toDate}</p>}
                </div>
              </div>

              {numberOfDays > 0 && (
                <div className="bg-amber-50 rounded-xl px-4 py-2.5 text-sm text-amber-700 font-medium">
                  📅 Duration: {numberOfDays} day{numberOfDays > 1 ? 's' : ''}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Arrival Time</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="time"
                    value={form.arrivalTime}
                    onChange={(e) => updateField('arrivalTime', e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Meal Planning */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800">🍽️ Day-wise Meal Planning</h3>
              <p className="text-sm text-slate-500">
                Select required meals for each day. Max count per meal: {form.totalVisitors} (total visitors).
              </p>

              {form.mealPlans.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Please set From/To dates in Step 1 first
                </div>
              ) : (
                <div className="space-y-3">
                  {form.mealPlans.map((meal, index) => (
                    <div key={meal.date} className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                      <p className="text-sm font-semibold text-slate-700 mb-3">
                        📅 {new Date(meal.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Breakfast */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={meal.breakfastRequired}
                              onChange={(e) => updateMeal(index, 'breakfastRequired', e.target.checked)}
                              className="w-4 h-4 text-amber-500 rounded"
                            />
                            <span className="text-xs font-medium text-slate-600">🥐 Breakfast</span>
                          </label>
                          {meal.breakfastRequired && (
                            <input
                              type="number"
                              min={1}
                              max={form.totalVisitors}
                              value={meal.breakfastCount}
                              onChange={(e) => updateMeal(index, 'breakfastCount', parseInt(e.target.value) || 0)}
                              className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                                errors[`breakfast_${index}`] ? 'border-red-300' : 'border-slate-200'
                              }`}
                            />
                          )}
                          {errors[`breakfast_${index}`] && <p className="text-xs text-red-500 mt-1">{errors[`breakfast_${index}`]}</p>}
                        </div>

                        {/* Lunch */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={meal.lunchRequired}
                              onChange={(e) => updateMeal(index, 'lunchRequired', e.target.checked)}
                              className="w-4 h-4 text-emerald-500 rounded"
                            />
                            <span className="text-xs font-medium text-slate-600">🍛 Lunch</span>
                          </label>
                          {meal.lunchRequired && (
                            <input
                              type="number"
                              min={1}
                              max={form.totalVisitors}
                              value={meal.lunchCount}
                              onChange={(e) => updateMeal(index, 'lunchCount', parseInt(e.target.value) || 0)}
                              className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                                errors[`lunch_${index}`] ? 'border-red-300' : 'border-slate-200'
                              }`}
                            />
                          )}
                          {errors[`lunch_${index}`] && <p className="text-xs text-red-500 mt-1">{errors[`lunch_${index}`]}</p>}
                        </div>

                        {/* Dinner */}
                        <div className="bg-white rounded-lg p-3 border border-slate-100">
                          <label className="flex items-center gap-2 mb-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={meal.dinnerRequired}
                              onChange={(e) => updateMeal(index, 'dinnerRequired', e.target.checked)}
                              className="w-4 h-4 text-indigo-500 rounded"
                            />
                            <span className="text-xs font-medium text-slate-600">🍽️ Dinner</span>
                          </label>
                          {meal.dinnerRequired && (
                            <input
                              type="number"
                              min={1}
                              max={form.totalVisitors}
                              value={meal.dinnerCount}
                              onChange={(e) => updateMeal(index, 'dinnerCount', parseInt(e.target.value) || 0)}
                              className={`w-full px-3 py-1.5 bg-slate-50 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/30 ${
                                errors[`dinner_${index}`] ? 'border-red-300' : 'border-slate-200'
                              }`}
                            />
                          )}
                          {errors[`dinner_${index}`] && <p className="text-xs text-red-500 mt-1">{errors[`dinner_${index}`]}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Additional Information */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-amber-500" /> Additional Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Baby size={14} /> Number of Kids
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.numberOfKids}
                    onChange={(e) => updateField('numberOfKids', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <HeartHandshake size={14} /> Number of Elderly
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.numberOfElderly}
                    onChange={(e) => updateField('numberOfElderly', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Special Requirements</label>
                <input
                  type="text"
                  value={form.specialRequirements}
                  onChange={(e) => updateField('specialRequirements', e.target.value)}
                  placeholder="e.g., Wheelchair access, dietary restrictions"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  rows={3}
                  placeholder="Any additional notes or comments..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-5 border border-amber-100">
                <h4 className="text-sm font-semibold text-amber-800 mb-3">📋 Visit Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <p><strong>Mandal:</strong> {form.mandalName}</p>
                  <p><strong>Representative:</strong> {form.representativeName}</p>
                  <p><strong>Phone:</strong> {form.representativePhone}</p>
                  <p><strong>Visitors:</strong> {form.totalVisitors}</p>
                  <p><strong>Dates:</strong> {form.fromDate} → {form.toDate}</p>
                  <p><strong>Days:</strong> {numberOfDays}</p>
                  <p><strong>Kids:</strong> {form.numberOfKids}</p>
                  <p><strong>Elderly:</strong> {form.numberOfElderly}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-200 transition-colors disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl text-sm font-medium hover:shadow-md transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    {editMode ? 'Update Visit' : 'Submit Request'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisitForm;

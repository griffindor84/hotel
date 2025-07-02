import React, { useState, useEffect, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { 
    getAuth,  
    signInWithCustomToken, 
    onAuthStateChanged, 
    signOut, 
    signInWithEmailAndPassword, 
   
} from 'firebase/auth';
import AdminPanel from './components/AdminPanel';

import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
// Define the AppContext for Firebase instances and user ID
const AppContext = createContext();
// ...existing code...
// ...existing imports...
const initialAuthToken = process.env.REACT_APP_initialAuthToken || null;
const appId = process.env.REACT_APP_APP_ID || 'default-app-id';
const firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG || '{}');
// ...existing code...
export const AppProvider = ({ children }) => {
    const [app, setApp] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false); // To ensure auth is ready before Firestore ops

    useEffect(() => {
    const initializeFirebase = async () => {
        let firebaseAppInstance;
        try {
            firebaseAppInstance = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(firebaseAppInstance);
            const firebaseAuth = getAuth(firebaseAppInstance);

            setApp(firebaseAppInstance);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    setUserId(null);
                }
                setIsAuthReady(true);
            });

          
        } catch (e) {
            console.error("Error initializing Firebase:", e);
            setIsAuthReady(true);
        }
    };

    if (!app) {
        initializeFirebase();
    }
}, [app]);

    const contextValue = { app, db, auth, userId, isAuthReady };

    return (
        <AppContext.Provider value={contextValue}>
            {children}
        </AppContext.Provider>
    );
};

const useAppContext = () => {
    return useContext(AppContext);
};

// Global environment variables (provided by the Canvas environment)

// Helper to simulate serverTimestamp as it's not directly imported with getFirestore
// In a real Firebase setup, you'd import and use `serverTimestamp` from 'firebase/firestore'.
// For this environment, we'll use new Date() as a client-side timestamp.
const serverTimestamp = () => new Date();


// Utility function for showing messages (replaces alert/confirm)
const MessageBox = ({ message, type, onClose }) => {
    if (!message) return null;

    let bgColor, textColor, borderColor;
    if (type === 'success') {
        bgColor = '#d4edda';
        textColor = '#155724';
        borderColor = '#c3e6cb';
    } else if (type === 'error') {
        bgColor = '#f8d7da';
        textColor = '#721c24';
        borderColor = '#f5c6cb';
    } else {
        bgColor = '#cce5ff';
        textColor = '#004085';
        borderColor = '#b8daff';
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
        }}>
            <div style={{
                position: 'relative',
                backgroundColor: bgColor,
                color: textColor,
                border: `1px solid ${borderColor}`,
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '1.5rem',
                maxWidth: '24rem',
                width: '100%',
                margin: 'auto'
            }}>
                <p style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>{message}</p>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        color: '#6b7280',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: 0
                    }}
                >
                    &times;
                </button>
            </div>
        </div>
    );
};

// Modal for displaying drafted messages from LLM
const DraftMessageModal = ({ title, message, onClose }) => {
    const handleCopyToClipboard = () => {
        const el = document.createElement('textarea');
        el.value = message;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        window.alert('Message copied to clipboard!');
    };

    if (!message) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            overflowY: 'auto'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '32rem',
                margin: 'auto 1rem'
            }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{title}</h3>
                <textarea
                    style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '1px solid #ccc',
                        borderRadius: '0.375rem',
                        resize: 'vertical',
                        minHeight: '150px',
                        backgroundColor: '#f9fafb',
                        color: '#374151',
                        marginBottom: '1rem'
                    }}
                    value={message}
                    readOnly
                ></textarea>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                        onClick={handleCopyToClipboard}
                        style={{
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Copy to Clipboard
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#6b7280',
                            color: '#fff',
                            fontWeight: 'bold',
                            padding: '0.5rem 1rem',
                            borderRadius: '0.25rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

// UI Component: Dashboard Overview
const DashboardOverview = ({ rooms, bookings, websiteBookings, setCurrentView, currentHotelDate, earningsOfTheDay, roomsSoldDay, paxCountDay, cityLedgerBalance, handleEndOfDayProcess, isProcessingEndOfDay }) => {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(room => room.status === 'available').length;
    const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
    const totalBookings = bookings.length;
    const pendingWebsiteBookings = websiteBookings.filter(b => b.status === 'pending').length;

    const occupancyRate = totalRooms > 0 ? ((occupiedRooms) / totalRooms * 100).toFixed(2) : 0;

   const today = new Date(currentHotelDate);
today.setHours(0, 0, 0, 0);

const checkInsToday = bookings.filter(b => {
    if (b.status !== 'checkedIn') return false;
    const checkIn = new Date(b.checkInDate);
    const checkOut = new Date(b.checkOutDate);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    // Is today >= checkIn and today < checkOut
    return today >= checkIn && today < checkOut;
}).length;

const paxCountToday = bookings.filter(b => {
    if (b.status !== 'checkedIn') return false;
    const checkIn = new Date(b.checkInDate);
    const checkOut = new Date(b.checkOutDate);
    checkIn.setHours(0, 0, 0, 0);
    checkOut.setHours(0, 0, 0, 0);
    return today >= checkIn && today < checkOut;
}).reduce((sum, b) => sum + (b.paxCount || 0), 0);
// Calculate check-outs today
const checkOutsToday = bookings.filter(b => {
    if (b.status !== 'checkedOut') return false;
    const checkOut = new Date(b.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);
    return checkOut.getTime() === today.getTime();
}).length;
    return (
        <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151' }}>Dashboard Overview</h2>
           
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
               
                <div style={{ backgroundColor: '#ecfdf5', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#047857' }}>Available Rooms</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#059669' }}>{availableRooms}</p>
                </div>
                <div style={{ backgroundColor: '#fffbeb', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#b45309' }}>Occupied Rooms</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#d97706' }}>{occupiedRooms}</p>
                </div>
                <div style={{ backgroundColor: '#f3e8ff', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#7e22ce' }}>Total Bookings</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#8b5cf6' }}>{totalBookings}</p>
                </div>
                <div
                    style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' }}
                    onClick={() => setCurrentView('websiteBookings')}
                >
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#dc2626' }}>Pending Website Bookings</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ef4444' }}>{pendingWebsiteBookings}</p>
                </div>
                <div style={{ backgroundColor: '#eef2ff', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#4338ca' }}>Occupancy Rate</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#6366f1' }}>{occupancyRate}%</p>
                </div>
                <div style={{ backgroundColor: '#ccfbf1', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#0d9488' }}>Check-ins Today</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#14b8a6' }}>{checkInsToday}</p>
                </div>
                <div style={{ backgroundColor: '#ffedd5', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#c2410c' }}>Check-outs Today</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#ea580c' }}>{checkOutsToday}</p>
                </div>
               
                <div style={{ backgroundColor: '#e0f2fe', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#0284c7' }}>Rooms Sold Today ({currentHotelDate})</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#0369a1' }}>{roomsSoldDay}</p>
                </div>
                <div style={{ backgroundColor: '#ede9fe', padding: '1rem', borderRadius: '0.5rem', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', color: '#6d28d9' }}>Pax Today ({currentHotelDate})</h3>
                    <p style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#7c3aed' }}>{paxCountToday}</p>
                </div>
                
            </div>
        </div>
    );
};

// UI Component: Rooms Management
const RoomsManagement = ({ rooms, setShowRoomsModal, setEditRoomData, handleDeleteRoom }) => (
    <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>Room Management</h2>
            <button
                onClick={() => { setShowRoomsModal(true); setEditRoomData(null); }}
                style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
            >
                Add New Room
            </button>
        </div>

        {rooms.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No rooms added yet. Click "Add New Room" to get started.</p>
        ) : (
            <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Room Number
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Type
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Capacity
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Price/Night
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Status
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', position: 'relative' }}>
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                        {rooms.map((room) => (
                            <tr key={room.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                    {room.roomNumber}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {room.type}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {room.capacity}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    ${room.price ? room.price.toFixed(2) : '0.00'}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        display: 'inline-flex',
                                        fontSize: '0.75rem',
                                        lineHeight: '1.25rem',
                                        fontWeight: '600',
                                        borderRadius: '9999px',
                                        backgroundColor: room.status === 'available' ? '#d1fae5' : room.status === 'occupied' ? '#fee2e2' : '#e5e7eb',
                                        color: room.status === 'available' ? '#065f46' : room.status === 'occupied' ? '#991b1b' : '#374151'
                                    }}>
                                        {room.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500' }}>
                                    <button
                                        onClick={() => { setShowRoomsModal(true); setEditRoomData(room); }}
                                        style={{ color: '#4f46e5', marginRight: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRoom(room.id)}
                                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// UI Component: Bookings Management
const BookingsManagement = ({ bookings, setShowBookingsModal, setEditBookingData, handleDeleteBooking, generateGuestMessage, isDrafting, rooms, addChargeOrPaymentToBooking, checkInGuest, checkOutGuest, generateInvoice }) => (
    <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151' }}>Booking Management</h2>
            <button
                onClick={() => { setShowBookingsModal(true); setEditBookingData(null); }}
                style={{
                    backgroundColor: '#2563eb',
                    color: '#fff',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.375rem',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
            >
                Add New Booking
            </button>
        </div>

        {bookings.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No bookings added yet.</p>
        ) : (
            <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Guest Name
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Room
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Dates
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Pax
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Balance Due
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Status
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', position: 'relative' }}>
                                <span className="sr-only">Actions</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                        {bookings.map((booking) => (
                            <tr key={booking.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                    {booking.guestName}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.roomNumber ? `No. ${booking.roomNumber} (${booking.roomType})` : booking.roomType}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.checkInDate} to {booking.checkOutDate}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.paxCount}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    ${booking.balanceDue ? booking.balanceDue.toFixed(2) : '0.00'}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        display: 'inline-flex',
                                        fontSize: '0.75rem',
                                        lineHeight: '1.25rem',
                                        fontWeight: '600',
                                        borderRadius: '9999px',
                                        backgroundColor: booking.status === 'confirmed' ? '#d1fae5' : booking.status === 'pending' ? '#fffbeb' : booking.status === 'checkedIn' ? '#eff6ff' : booking.status === 'checkedOut' ? '#e5e7eb' : '#fee2e2',
                                        color: booking.status === 'confirmed' ? '#065f46' : booking.status === 'pending' ? '#92400e' : booking.status === 'checkedIn' ? '#1e40af' : booking.status === 'checkedOut' ? '#374151' : '#991b1b'
                                    }}>
                                        {booking.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500' }}>
                                    {/* Edit button */}
                                    <button
                                        onClick={() => { setShowBookingsModal(true); setEditBookingData(booking); }}
                                        style={{ color: '#4f46e5', marginRight: '0.75rem', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                                    >
                                        Edit
                                    </button>
                                    {/* Check-in button */}
                                    {(booking.status === 'confirmed' || booking.status === 'pending') && (
                                        <button
                                            onClick={() => checkInGuest(booking.id, booking.roomId)}
                                            style={{ backgroundColor: '#22c55e', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', marginLeft: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                        >
                                            Check In
                                        </button>
                                    )}
                                    {/* Check-out button */}
                                    {booking.status === 'checkedIn' && (
                                        <button
                                            onClick={() => checkOutGuest(booking.id, booking.roomId)}
                                            style={{ backgroundColor: '#f97316', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', marginLeft: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                        >
                                            Check Out
                                        </button>
                                    )}
                                    {/* Add Charge/Payment buttons for checked-in guests */}
                                    {booking.status === 'checkedIn' && (
                                        <>
                                            <button
                                                onClick={() => addChargeOrPaymentToBooking(booking.id, 'charge')}
                                                style={{ backgroundColor: '#f97316', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', marginLeft: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                            >
                                                Add Charge
                                            </button>
                                            <button
                                                onClick={() => addChargeOrPaymentToBooking(booking.id, 'payment')}
                                                style={{ backgroundColor: '#22c55e', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', marginLeft: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                            >
                                                Add Payment
                                            </button>
                                        </>
                                    )}
                                    {/* Generate Invoice Button */}
                                    {(booking.status === 'checkedIn' || booking.status === 'checkedOut') && (
                                        <button
                                            onClick={() => generateInvoice(booking.id)}
                                            style={{ backgroundColor: '#60a5fa', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', marginLeft: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                        >
                                            Generate Invoice
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteBooking(booking.id)}
                                        style={{ color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// UI Component: Website Bookings Management
const WebsiteBookingsManagement = ({ websiteBookings, handleAcceptWebsiteBooking, handleRejectWebsiteBooking }) => (
    <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#374151', marginBottom: '1rem' }}>Pending Website Booking Requests ({websiteBookings.length})</h2>
        {websiteBookings.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No pending website booking requests at the moment.</p>
        ) : (
            <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Guest Name
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Email
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Requested Dates
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Room Type
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Pax
                            </th>
                            <th style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '500', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                        {websiteBookings.map((booking) => (
                            <tr key={booking.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '500', color: '#111827' }}>
                                    {booking.guestName}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.guestEmail}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.checkInDate} to {booking.checkOutDate}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.roomTypeRequested}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', fontSize: '0.875rem', color: '#6b7280' }}>
                                    {booking.paxCount}
                                </td>
                                <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap', textAlign: 'right', fontSize: '0.875rem', fontWeight: '500' }}>
                                    <button
                                        onClick={() => handleAcceptWebsiteBooking(booking)}
                                        style={{ backgroundColor: '#22c55e', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', marginRight: '0.5rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                    >
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleRejectWebsiteBooking(booking.id)}
                                        style={{ backgroundColor: '#ef4444', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '0.25rem', fontSize: '0.75rem', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                    >
                                        Reject
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
    </div>
);

// UI Component: Reports Management
const ReportsManagement = ({
  dailySummaries,
  currentHotelDate,
  cityLedgerBalance,
  earningsOfTheDay,        // <-- add this
  handleEndOfDayProcess,
  isProcessingEndOfDay,
  onShowCityLedger         // <-- add this if you use it
}) => {
    const [selectedDate, setSelectedDate] = useState(currentHotelDate);
    const [selectedMonth, setSelectedMonth] = useState(currentHotelDate.substring(0, 7)); //-MM

    const handleDateChange = (e) => setSelectedDate(e.target.value);
    const handleMonthChange = (e) => setSelectedMonth(e.target.value);

    const filteredDailySummary = dailySummaries.find(summary => summary.id === selectedDate);

    // Calculate monthly summary
    const monthlySummary = dailySummaries.filter(summary => summary.id.startsWith(selectedMonth))
        .reduce((acc, curr) => {
            acc.totalSalesMonthly += curr.totalSalesDay || 0;
            acc.totalRoomsSoldMonthly += curr.roomsSoldDay || 0;
            acc.totalPaxMonthly += curr.paxCountDay || 0;
            acc.totalAccommodationChargesMonthly += curr.totalAccommodationChargesDaily || 0;
            acc.totalOtherChargesMonthly += curr.otherChargesDaily || 0;
            acc.totalPaymentsReceivedMonthly += curr.totalPaymentsReceivedDaily || 0;
            return acc;
        }, {
            totalSalesMonthly: 0,
            totalRoomsSoldMonthly: 0,
            totalPaxMonthly: 0,
            totalAccommodationChargesMonthly: 0,
            totalOtherChargesMonthly: 0,
            totalPaymentsReceivedMonthly: 0,
        });

    return (
        <div style={{ padding: '1.5rem', backgroundColor: '#fff', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151' }}>Reports</h2>
                                 <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
    <div style={{
        backgroundColor: '#dcfce7',
        padding: '0.5rem 0.75rem',
        borderRadius: '0.375rem',
        minWidth: 140,
        flex: 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#16a34a', margin: 0 }}>Earnings ({currentHotelDate})</h3>
        <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#22c55e', margin: 0 }}>${earningsOfTheDay ? earningsOfTheDay.toFixed(2) : '0.00'}</p>
    </div>
    <div
        style={{
            backgroundColor: '#f0f9ff',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.375rem',
            minWidth: 140,
            flex: 1,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            cursor: 'pointer'
        }}
        onClick={onShowCityLedger}
        title="Click to view city ledger details"
    >
        <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#0c4a6e', margin: 0 }}>City Ledger</h3>
        <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#075985', margin: 0 }}>${cityLedgerBalance ? cityLedgerBalance.toFixed(2) : '0.00'}</p>
    </div>
</div>
         <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#e0f2f7', borderRadius: '0.375rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '1rem', fontWeight: 'bold', color: '#00707c' }}>Current Hotel Date: {currentHotelDate}</p>
                <button
                    onClick={handleEndOfDayProcess}
                    disabled={isProcessingEndOfDay}
                    style={{
                        backgroundColor: '#10b981', // Green for action
                        color: '#fff',
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    {isProcessingEndOfDay ? 'Processing...' : 'End of Day Process'}
                </button>
            </div>
            {/* Daily Report Section */}
            <div style={{ marginBottom: '2rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151' }}>Daily Report</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Select Date:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        style={{
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            appearance: 'none',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            color: '#374151',
                            lineHeight: '1.25rem',
                            outline: 'none'
                        }}
                    />
                </div>
                {filteredDailySummary ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                        <div style={{ padding: '0.75rem', border: '1px solid #c3e6cb', borderRadius: '0.375rem', backgroundColor: '#d4edda' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#155724' }}>Total Sales:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1c3e6b' }}>${(filteredDailySummary.totalSalesDay || 0).toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #cce5ff', borderRadius: '0.375rem', backgroundColor: '#e0f2f7' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#004085' }}>Rooms Sold:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0056b3' }}>{filteredDailySummary.roomsSoldDay || 0}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #ffeeba', borderRadius: '0.375rem', backgroundColor: '#fff3cd' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#856404' }}>Pax Count:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#a08500' }}>{filteredDailySummary.paxCountDay || 0}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #b8daff', borderRadius: '0.375rem', backgroundColor: '#cce5ff' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#004085' }}>Accommodation Charges:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0056b3' }}>${(filteredDailySummary.totalAccommodationChargesDaily || 0).toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #f5c6cb', borderRadius: '0.375rem', backgroundColor: '#f8d7da' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#721c24' }}>Other Charges:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8a1f24' }}>${(filteredDailySummary.otherChargesDaily || 0).toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #c3e6cb', borderRadius: '0.375rem', backgroundColor: '#d4edda' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#155724' }}>Payments Received:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1c3e6b' }}>${(filteredDailySummary.totalPaymentsReceivedDaily || 0).toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #d6d8d9', borderRadius: '0.375rem', backgroundColor: '#e2e3e5' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#383d41' }}>City Ledger (Opening):</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#495057' }}>${(filteredDailySummary.cityLedgerOpeningBalance || 0).toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #d6d8d9', borderRadius: '0.375rem', backgroundColor: '#e2e3e5' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#383d41' }}>City Ledger (Closing):</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#495057' }}>${(filteredDailySummary.cityLedgerClosingBalance || 0).toFixed(2)}</p>
                        </div>

                    </div>
                ) : (
                    <p style={{ color: '#6b7280' }}>No report data for {selectedDate}.</p>
                )}
            </div>

            {/* Monthly Report Section */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '1rem', backgroundColor: '#f9fafb' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#374151' }}>Monthly Report</h3>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Select Month:</label>
                    <input
                        type="month"
                        value={selectedMonth}
                        onChange={handleMonthChange}
                        style={{
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            appearance: 'none',
                            border: '1px solid #ccc',
                            borderRadius: '0.25rem',
                            padding: '0.5rem 0.75rem',
                            color: '#374151',
                            lineHeight: '1.25rem',
                            outline: 'none'
                        }}
                    />
                </div>
                {dailySummaries.filter(summary => summary.id.startsWith(selectedMonth)).length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                         <div style={{ padding: '0.75rem', border: '1px solid #c3e6cb', borderRadius: '0.375rem', backgroundColor: '#d4edda' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#155724' }}>Total Sales:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1c3e6b' }}>${monthlySummary.totalSalesMonthly.toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #cce5ff', borderRadius: '0.375rem', backgroundColor: '#e0f2f7' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#004085' }}>Rooms Sold:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0056b3' }}>{monthlySummary.totalRoomsSoldMonthly}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #ffeeba', borderRadius: '0.375rem', backgroundColor: '#fff3cd' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#856404' }}>Pax Count:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#a08500' }}>{monthlySummary.totalPaxMonthly}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #b8daff', borderRadius: '0.375rem', backgroundColor: '#cce5ff' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#004085' }}>Accommodation Charges:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0056b3' }}>${monthlySummary.totalAccommodationChargesMonthly.toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #f5c6cb', borderRadius: '0.375rem', backgroundColor: '#f8d7da' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#721c24' }}>Other Charges:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#8a1f24' }}>${monthlySummary.totalOtherChargesMonthly.toFixed(2)}</p>
                        </div>
                        <div style={{ padding: '0.75rem', border: '1px solid #c3e6cb', borderRadius: '0.375rem', backgroundColor: '#d4edda' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'semibold', color: '#155724' }}>Payments Received:</p>
                            <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#1c3e6b' }}>${monthlySummary.totalPaymentsReceivedMonthly.toFixed(2)}</p>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: '#6b7280' }}>No report data for {selectedMonth}.</p>
                )}
            </div>
        </div>
    );
};


const RoomModal = ({ room, onClose, onSave }) => {
    const [formData, setFormData] = useState(room || {
        type: 'Standard', roomNumber: '', status: 'available', price: 0, capacity: 1
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '28rem',
                margin: 'auto'
            }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{room ? 'Edit Room' : 'Add New Room'}</h3>
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Room Number</label>
                        <input
                            type="text"
                            name="roomNumber"
                            value={formData.roomNumber}
                            onChange={handleChange}
                            style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                appearance: 'none',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                color: '#374151',
                                lineHeight: '1.25rem',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Room Type</label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                color: '#374151',
                                lineHeight: '1.25rem',
                                outline: 'none'
                            }}
                            required
                        >
                            <option value="Standard">Standard</option>
                            <option value="Deluxe">Deluxe</option>
                            <option value="Suite">Suite</option>
                        </select>
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Capacity</label>
                        <input
                            type="number"
                            name="capacity"
                            value={formData.capacity}
                            onChange={handleChange}
                            style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                appearance: 'none',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                color: '#374151',
                                lineHeight: '1.25rem',
                                outline: 'none'
                            }}
                            min="1"
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Price Per Night</label>
                        <input
                            type="number"
                            name="price"
                            value={formData.price}
                            onChange={handleChange}
                            step="0.01"
                            style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                appearance: 'none',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                color: '#374151',
                                lineHeight: '1.25rem',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                color: '#374151',
                                lineHeight: '1.25rem',
                                outline: 'none'
                            }}
                            required
                        >
                            <option value="available">Available</option>
                            <option value="occupied">Occupied</option>
                            <option value="maintenance">Maintenance</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            type="submit"
                            style={{
                                backgroundColor: '#22c55e',
                                color: '#fff',
                                fontWeight: 'bold',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.25rem',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            {room ? 'Update Room' : 'Add Room'}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                backgroundColor: '#6b7280',
                                color: '#fff',
                                fontWeight: 'bold',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.25rem',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// UI Component: Modal for Adding/Editing Bookings
const BookingModal = ({ booking, onClose, onSave, rooms, onDraftMessage, isDrafting }) => {
   const [formData, setFormData] = useState(booking || {
    guestName: '',
    guestEmail: '',
    roomType: '',
    roomId: '',
    roomNumber: '',
    checkInDate: '',
    checkOutDate: '',
    pricePerNight: 0, // <-- add this line
    totalPrice: 0,
    balanceDue: 0,
    status: 'pending',
    paxCount: 1,
    specialRequests: '',
});

    useEffect(() => {
        if (formData.roomType && !formData.roomId) {
            const foundRoom = rooms.find(r => r.type === formData.roomType && r.status === 'available');
            if (foundRoom) {
                setFormData(prev => ({
                    ...prev,
                    roomId: foundRoom.id,
                    roomNumber: foundRoom.roomNumber
                }));
            }
        }
    }, [formData.roomType, formData.roomId, rooms]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'roomType') {
            setFormData(prev => ({ ...prev, [name]: value, roomId: '', roomNumber: '' }));
            const foundRoom = rooms.find(r => r.type === value && r.status === 'available');
            if (foundRoom) {
                setFormData(prev => ({
                    ...prev,
                    roomType: value,
                    roomId: foundRoom.id,
                    roomNumber: foundRoom.roomNumber
                }));
            }
        }else if (name === 'roomId') {
    const selectedRoom = rooms.find(r => r.id === value);
    setFormData(prev => ({
        ...prev,
        roomId: value,
        roomNumber: selectedRoom ? selectedRoom.roomNumber : '',
        // Do NOT set pricePerNight here
    }));
}else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    const availableRoomsForType = rooms.filter(r => r.type === formData.roomType && (r.status === 'available' || r.id === formData.roomId));

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            overflowY: 'auto'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '36rem',
                margin: 'auto 1rem'
            }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>{booking ? 'Edit Booking' : 'Add New Booking'}</h3>
                <form onSubmit={handleSubmit}>
                    {/* Removed the inline media query for gridTemplateColumns */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Guest Name</label>
                            <input type="text" name="guestName" value={formData.guestName} onChange={handleChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', appearance: 'none', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none' }} required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Guest Email</label>
                            <input type="email" name="guestEmail" value={formData.guestEmail} onChange={handleChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', appearance: 'none', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none' }} required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Room Type</label>
                            <select name="roomType" value={formData.roomType} onChange={handleChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none' }} required>
                                <option value="">Select Type</option>
                                <option value="Standard">Standard</option>
                                <option value="Deluxe">Deluxe</option>
                                <option value="Suite">Suite</option>
                            </select>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Assign Room</label>
                            <select name="roomId" value={formData.roomId} onChange={handleChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none' }} required>
                                <option value="">Select Room</option>
                                {availableRoomsForType.map(room => (
                                    <option key={room.id} value={room.id}>
                                        No. {room.roomNumber} (Capacity: {room.capacity})
                                    </option>
                                ))}
                            </select>
                        </div>
                                          <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Price Per Night</label>
                        <input
                            type="number"
                            name="pricePerNight"
                            value={formData.pricePerNight}
                            onChange={handleChange}
                            step="0.01"
                            style={{
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                appearance: 'none',
                                border: '1px solid #ccc',
                                borderRadius: '0.25rem',
                                width: '100%',
                                padding: '0.5rem 0.75rem',
                                color: '#374151',
                                lineHeight: '1.25rem',
                                outline: 'none'
                            }}
                            required
                        />
                    </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Check-in Date</label>
                         <Flatpickr
    value={formData.checkInDate}
    options={{ dateFormat: "Y-m-d", minDate: "today" }}
    onChange={([date]) => setFormData(prev => ({
        ...prev,
        checkInDate: date ? date.toISOString().substring(0, 10) : ""
    }))}
    style={{
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        appearance: 'none',
        border: '1px solid #ccc',
        borderRadius: '0.25rem',
        width: '100%',
        padding: '0.5rem 0.75rem',
        color: '#374151',
        lineHeight: '1.25rem',
        outline: 'none'
    }}/>
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Check-out Date</label>
                         <Flatpickr
    value={formData.checkOutDate}
    options={{ dateFormat: "Y-m-d", minDate: formData.checkInDate || "today" }}
    onChange={([date]) => setFormData(prev => ({
        ...prev,
        checkOutDate: date ? date.toISOString().substring(0, 10) : ""
    }))}
    style={{
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        appearance: 'none',
        border: '1px solid #ccc',
        borderRadius: '0.25rem',
        width: '100%',
        padding: '0.5rem 0.75rem',
        color: '#374151',
        lineHeight: '1.25rem',
        outline: 'none'
    }}
/>
</div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Number of Guests (Pax)</label>
                            <input type="number" name="paxCount" value={formData.paxCount} onChange={handleChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', appearance: 'none', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none' }} min="1" max="6" required />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Total Price (Initial Booking)</label>
                            <input type="number" name="totalPrice" value={formData.totalPrice} readOnly onChange={handleChange}
                                step="0.01" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', appearance: 'none', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none',backgroundColor: '#e9ecef' }} required />
                        </div>
                         <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Balance Due</label>
                            {/* Balance Due is now read-only */}
                            <input type="number" name="balanceDue" value={formData.balanceDue} readOnly
                                step="0.01" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', appearance: 'none', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none', backgroundColor: '#e9ecef' }} />
                        </div>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Status</label>
                            {/* Status is now disabled */}
                            <select name="status" value={formData.status} disabled
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none', backgroundColor: '#e9ecef' }}>
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="checkedIn">Checked In</option>
                                <option value="checkedOut">Checked Out</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1', marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', color: '#374151', fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Special Requests</label>
                            <textarea name="specialRequests" value={formData.specialRequests} onChange={handleChange}
                                style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)', appearance: 'none', border: '1px solid #ccc', borderRadius: '0.25rem', width: '100%', padding: '0.5rem 0.75rem', color: '#374151', lineHeight: '1.25rem', outline: 'none', height: '6rem' }}></textarea>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                        <button type="submit"
                            style={{
                                backgroundColor: '#22c55e',
                                color: '#fff',
                                fontWeight: 'bold',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.25rem',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                width: '100%',
                                marginBottom: '0.5rem'
                            }}>
                            {booking ? 'Update Booking' : 'Add Booking'}
                        </button>
                        {/* Removed the inline media query for width in the button group */}
                        <div style={{ display: 'flex', gap: '0.5rem', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <button
                                type="button"
                                onClick={() => onDraftMessage(formData, 'welcome')}
                                style={{
                                    backgroundColor: '#9333ea',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.25rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    flex: '1',
                                    minWidth: 'fit-content',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                disabled={isDrafting}
                            >
                                {isDrafting ? 'Drafting...' : '✨ Welcome Msg'}
                            </button>
                            {formData.specialRequests && (
                                <button
                                    type="button"
                                    onClick={() => onDraftMessage(formData, 'specialRequest')}
                                    style={{
                                        backgroundColor: '#ec4899',
                                        color: '#fff',
                                        fontWeight: 'bold',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.25rem',
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'background-color 0.2s',
                                        flex: '1',
                                        minWidth: 'fit-content',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    disabled={isDrafting}
                                >
                                    {isDrafting ? 'Drafting...' : '✨ Request Res.'}
                                </button>
                            )}
                            <button type="button" onClick={onClose}
                                style={{
                                    backgroundColor: '#6b7280',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.25rem',
                                    border: 'none',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                    flex: '1',
                                    minWidth: 'fit-content'
                                }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InvoiceModal = ({ booking, transactions, onClose }) => {
    if (!booking || !transactions) return null;

    const totalCharges = transactions.filter(t => t.type === 'charge').reduce((sum, t) => sum + t.amount, 0);
    const totalPayments = transactions.filter(t => t.type === 'payment').reduce((sum, t) => sum + t.amount, 0);
    const finalBalance = totalCharges - totalPayments;

    const handlePrint = () => {
        const printContent = document.getElementById('invoice-content').innerHTML;
        const originalContent = document.body.innerHTML;
        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // Reload to restore original state and listeners
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            overflowY: 'auto'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '2rem',
                width: '100%',
                maxWidth: '48rem',
                margin: 'auto 1rem',
                fontSize: '0.9rem'
            }}>
                <div id="invoice-content">
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: '#374151' }}>Invoice</h2>
                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', marginBottom: '0.75rem', color: '#4b5563' }}>Guest Details:</h3>
                        <p><strong>Name:</strong> {booking.guestName}</p>
                        <p><strong>Email:</strong> {booking.guestEmail}</p>
                        <p><strong>Room:</strong> {booking.roomNumber} ({booking.roomType})</p>
                        <p><strong>Check-in:</strong> {booking.checkInDate}</p>
                        <p><strong>Check-out:</strong> {booking.checkOutDate}</p>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 'semibold', marginBottom: '0.75rem', color: '#4b5563' }}>Transaction Summary:</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f9fafb' }}>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t, index) => (
                                    <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '0.75rem', textAlign: 'left' }}>{t.date}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'left' }}>{t.description}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>${t.amount.toFixed(2)}</td>
                                        <td style={{ padding: '0.75rem', textAlign: 'left', color: t.type === 'charge' ? '#dc2626' : '#10b981' }}>{t.type.toUpperCase()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '1.5rem', paddingRight: '0.75rem' }}>
                        <div style={{ width: '100%', maxWidth: '15rem', borderTop: '2px solid #e5e7eb', paddingTop: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'semibold', color: '#4b5563' }}>Total Charges:</span>
                                <span style={{ fontWeight: 'bold' }}>${totalCharges.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: 'semibold', color: '#4b5563' }}>Total Payments:</span>
                                <span style={{ fontWeight: 'bold' }}>-${totalPayments.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 'bold', paddingTop: '0.75rem', borderTop: '1px dashed #d1d5db' }}>
                                <span style={{ color: '#374151' }}>Balance Due:</span>
                                <span style={{ color: finalBalance > 0 ? '#dc2626' : '#10b981' }}>${finalBalance.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div> {/* End invoice-content */}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                    <button
                        onClick={handlePrint}
                        style={{
                            backgroundColor: '#10b981',
                            color: '#fff',
                            fontWeight: 'bold',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        Print Invoice
                    </button>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#6b7280',
                            color: '#fff',
                            fontWeight: 'bold',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.375rem',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
const CityLedgerModal = ({ transactions, onClose }) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            zIndex: 1000,
            overflowY: 'auto'
        }}>
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                padding: '2rem',
                width: '100%',
                maxWidth: '48rem',
                margin: 'auto 1rem',
                fontSize: '0.9rem'
            }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center', color: '#374151' }}>City Ledger Transactions</h2>
                {transactions.length === 0 ? (
                    <p style={{ color: '#6b7280' }}>No city ledger transactions found.</p>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                                <th style={{ padding: '0.75rem', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
                                <th style={{ padding: '0.75rem', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map((t, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '0.75rem', textAlign: 'left' }}>{t.date}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'left' }}>{t.description}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>${t.amount.toFixed(2)}</td>
                                    <td style={{ padding: '0.75rem', textAlign: 'left', color: t.type === 'charge' ? '#dc2626' : '#10b981' }}>{t.type.toUpperCase()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <button
                    onClick={onClose}
                    style={{
                        backgroundColor: '#6b7280',
                        color: '#fff',
                        fontWeight: 'bold',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.375rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

// Main App Component
const App = () => {
    const { db, userId, isAuthReady , auth } = useAppContext();
    const [currentView, setCurrentView] = useState('dashboard');
    const [rooms, setRooms] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [websiteBookings, setWebsiteBookings] = useState([]);
    const [dailySummaries, setDailySummaries] = useState([]); // New state for daily reports
    const [showRoomsModal, setShowRoomsModal] = useState(false);
    const [showBookingsModal, setShowBookingsModal] = useState(false);
    const [editRoomData, setEditRoomData] = useState(null);
    const [editBookingData, setEditBookingData] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [draftedMessageContent, setDraftedMessageContent] = useState('');
    const [draftMessageTitle, setDraftMessageTitle] = useState('');
    const [isDrafting, setIsDrafting] = useState(false);

    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceBookingData, setInvoiceBookingData] = useState(null);
    const [invoiceTransactions, setInvoiceTransactions] = useState([]);


    const [currentHotelDate, setCurrentHotelDate] = useState(new Date().toISOString().substring(0, 10)); //-MM-DD
    const [cityLedgerBalance, setCityLedgerBalance] = useState(0);
    const [earningsOfTheDay, setEarningsOfTheDay] = useState(0);
    const [roomsSoldDay, setRoomsSoldDay] = useState(0);
    const [paxCountDay, setPaxCountDay] = useState(0);
    const [isProcessingEndOfDay, setIsProcessingEndOfDay] = useState(false);
    const [showCityLedgerModal, setShowCityLedgerModal] = useState(false);
        const [isSigningIn, setIsSigningIn] = useState(false); 
        const [userRole, setUserRole] = useState(null);
        useEffect(() => {
        if (!auth || !userId) return;
        let isMounted = true;
        const fetchRole = async () => {
            const user = auth.currentUser;
            if (user) {
                const tokenResult = await user.getIdTokenResult(true); // force refresh to get latest claims
                if (isMounted) setUserRole(tokenResult.claims.role || null);
            } else {
                if (isMounted) setUserRole(null);
            }
        };
        fetchRole();
        return () => { isMounted = false; };
    }, [auth, userId]);
    const handleCloseCityLedger = () => setShowCityLedgerModal(false);
const [cityLedgerTransactions, setCityLedgerTransactions] = useState([]);
const handleShowCityLedger = async () => {
    if (!db || !userId) return;
    // Fetch all transactions from all bookings that are on account (city ledger)
    const bookingsRef = collection(db, `artifacts/${appId}/users/${userId}/bookings`);
    const bookingsSnap = await getDocs(bookingsRef);
    let allTransactions = [];
    for (const bookingDoc of bookingsSnap.docs) {
        const bookingId = bookingDoc.id;
        const transactionsRef = collection(db, `artifacts/${appId}/users/${userId}/bookings/${bookingId}/transactions`);
        const transactionsSnap = await getDocs(transactionsRef);
        transactionsSnap.forEach(doc => {
            const t = doc.data();
            // Optionally, filter for only city ledger transactions if you have a flag
            allTransactions.push(t);
        });
    }
    setCityLedgerTransactions(allTransactions);
    setShowCityLedgerModal(true);
};

    // Login form state
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    // Login handler
const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsSigningIn(true);
    try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
    } catch (err) {
        setLoginError(err.message);
    } finally {
        setIsSigningIn(false);
    }
};
    // Register handler (optional)
  

    // Logout handler
    const handleLogout = async () => {
        await signOut(auth);
    };
   const showMessage = (msg, type) => {
        setMessage(msg);
        setMessageType(type);
    };

    const closeMessage = () => {
        setMessage('');
        setMessageType('');
    };

    // --- Room Management Functions ---
    const handleAddOrUpdateRoom = async (roomData) => {
        if (!db || !userId) {
            showMessage('Database not ready. Please try again.', 'error');
            return;
        }

        try {
            if (roomData.id) { // Update existing room
                const roomRef = doc(db, `artifacts/${appId}/users/${userId}/rooms`, roomData.id);
                await updateDoc(roomRef, {
                    type: roomData.type,
                    roomNumber: roomData.roomNumber,
                    status: roomData.status,
                    price: parseFloat(roomData.price),
                    capacity: parseInt(roomData.capacity),
                });
                showMessage('Room updated successfully!', 'success');
            } else { // Add new room
                // Generate a unique ID for the new room if not provided
                const newRoomRef = doc(collection(db, `artifacts/${appId}/users/${userId}/rooms`));
                await setDoc(newRoomRef, {
                    roomNumber: roomData.roomNumber,
                    type: roomData.type,
                    status: 'available', // New rooms are always available
                    price: parseFloat(roomData.price),
                    capacity: parseInt(roomData.capacity),
                    createdAt: serverTimestamp(),
                });
                showMessage('Room added successfully!', 'success');
            }
            setShowRoomsModal(false);
            setEditRoomData(null);
        } catch (e) {
            console.error("Error adding/updating room:", e);
            showMessage(`Failed to save room: ${e.message}`, 'error');
        }
    };

    const handleDeleteRoom = async (roomId) => {
        if (!db || !userId) {
            showMessage('Database not ready. Please try again.', 'error');
            return;
        }

        // Prevent deletion if room is associated with a current booking
        const associatedBookings = bookings.filter(b => b.roomId === roomId && (b.status === 'confirmed' || b.status === 'checkedIn'));
        if (associatedBookings.length > 0) {
            showMessage('Cannot delete room: It is currently assigned to active bookings.', 'error');
            return;
        }

        if (window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/rooms`, roomId));
                showMessage('Room deleted successfully!', 'success');
            } catch (e) {
                console.error("Error deleting room:", e);
                showMessage(`Failed to delete room: ${e.message}`, 'error');
            }
        }
    };

    // --- Booking Management Functions ---
   const handleAddOrUpdateBooking = async (bookingData) => {
    if (!db || !userId) {
        showMessage('Database not ready. Please try again.', 'error');
        return;
    }

    const checkIn = new Date(bookingData.checkInDate);
    const checkOut = new Date(bookingData.checkOutDate);
    if (checkIn >= checkOut) {
        showMessage('Check-out date must be after check-in date.', 'error');
        return;
    }

    const isAvailable = await checkAvailabilityForBooking(
        bookingData.roomId,
        bookingData.checkInDate,
        bookingData.checkOutDate,
        bookingData.id // Pass existing booking ID to exclude itself from conflict check
    );

    if (!isAvailable) {
        showMessage('Selected room is not available for these dates or conflicts with another booking.', 'error');
        return;
    }

    // Only declare these ONCE, here:
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const pricePerNight = parseFloat(bookingData.pricePerNight);
    const totalPrice = pricePerNight * nights;

    try {
       if (bookingData.id) {
    const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingData.id);

    // Fetch all transactions for this booking
    const transactionsRef = collection(bookingRef, 'transactions');
    const transactionsSnap = await getDocs(transactionsRef);
    let otherCharges = 0;
    let payments = 0;
    transactionsSnap.forEach(doc => {
        const t = doc.data();
        if (t.type === 'charge') otherCharges += t.amount;
        if (t.type === 'payment') payments += t.amount;
    });
    const newBalanceDue = totalPrice + otherCharges - payments;

    await updateDoc(bookingRef, {
        // ...other fields...
        pricePerNight,
        totalPrice,
        balanceDue: newBalanceDue,
        // ...other fields...
    });
    showMessage('Booking updated successfully!', 'success');
}else {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/bookings`), {
                ...bookingData,
                paxCount: parseInt(bookingData.paxCount),
                pricePerNight,
                totalPrice,
                balanceDue: totalPrice,
                status: 'pending',
                createdAt: serverTimestamp(),
            });
            showMessage('Booking added successfully!', 'success');
        }
        setShowBookingsModal(false);
        setEditBookingData(null);
    } catch (e) {
        // ...error handling...
        console.error("Error adding/updating booking:", e);
        showMessage(`Failed to save booking: ${e.message}`, 'error');
    }
};

    const handleDeleteBooking = async (bookingId) => {
        if (!db || !userId) {
            showMessage('Database not ready. Please try again.', 'error');
            return;
        }
        if (window.confirm("Are you sure you want to delete this booking? This action cannot be undone.")) {
            try {
                await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId));
                showMessage('Booking deleted successfully!', 'success');
            } catch (e) {
                console.error("Error deleting booking:", e);
                showMessage(`Failed to delete booking: ${e.message}`, 'error');
            }
        }
    };

    const checkAvailabilityForBooking = async (roomId, checkInDateStr, checkOutDateStr, currentBookingId = null) => {
        if (!db || !userId) return false;

        const checkIn = new Date(checkInDateStr);
        const checkOut = new Date(checkOutDateStr);

        const bookingsRef = collection(db, `artifacts/${appId}/users/${userId}/bookings`);
        const q = query(bookingsRef, where('roomId', '==', roomId));
        const snapshot = await getDocs(q);
        const conflictingBookings = snapshot.docs.filter(doc => {
            const booking = doc.data();
            // Exclude the current booking itself when editing
            if (doc.id === currentBookingId) return false;

            const existingCheckIn = new Date(booking.checkInDate);
            const existingCheckOut = new Date(booking.checkOutDate);

            // Check for overlap, but only consider active booking statuses
            const noOverlap = checkOut <= existingCheckIn || checkIn >= existingCheckOut;
            return !noOverlap && (booking.status === 'confirmed' || booking.status === 'checkedIn' || booking.status === 'pending');
        });

        return conflictingBookings.length === 0;
    };

    // Function to handle guest check-in
    const checkInGuest = async (bookingId, roomId) => {
        if (!db || !userId) {
            showMessage('Database not ready.', 'error');
            return;
        }

        try {
            const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId);
            const roomRef = doc(db, `artifacts/${appId}/users/${userId}/rooms`, roomId);

            await updateDoc(bookingRef, { status: 'checkedIn', checkedInAt: serverTimestamp() });
            await updateDoc(roomRef, { status: 'occupied' });
            showMessage('Guest checked in successfully!', 'success');
        } catch (e) {
            console.error("Error checking in guest:", e);
            showMessage(`Failed to check in guest: ${e.message}`, 'error');
        }
    };

    // Function to handle guest check-out
    const checkOutGuest = async (bookingId, roomId) => {
        if (!db || !userId) {
            showMessage('Database not ready.', 'error');
            return;
        }

        try {
            const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId);
            const bookingDoc = await getDoc(bookingRef);

            if (!bookingDoc.exists()) {
                showMessage('Booking not found.', 'error');
                return;
            }

            const bookingData = bookingDoc.data();
            if (bookingData.balanceDue > 0) {
                showMessage(`Cannot check out. Outstanding balance of $${bookingData.balanceDue.toFixed(2)} is due.`, 'error');
                return;
            }

            const roomRef = doc(db, `artifacts/${appId}/users/${userId}/rooms`, roomId);

            await updateDoc(bookingRef, { status: 'checkedOut', checkedOutAt: serverTimestamp() });
            await updateDoc(roomRef, { status: 'available' }); // Make room available after checkout
            showMessage('Guest checked out successfully!', 'success');
        } catch (e) {
            console.error("Error checking out guest:", e);
            showMessage(`Failed to check out guest: ${e.message}`, 'error');
        }
    };

    // Function to add charge or payment to a booking
    const addChargeOrPaymentToBooking = async (bookingId, type) => {
        if (!db || !userId) {
            showMessage('Database not ready.', 'error');
            return;
        }
        const amountStr = window.prompt(`Enter amount for ${type}:`);
        const amount = parseFloat(amountStr);

        if (isNaN(amount) || amount <= 0) {
            showMessage('Invalid amount. Amount must be a positive number.', 'error');
            return;
        }

        const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId);
        const bookingDocSnap = await getDoc(bookingRef);

        if (!bookingDocSnap.exists()) {
            showMessage('Booking not found.', 'error');
            return;
        }

        const bookingData = bookingDocSnap.data();
        let newBalanceDue = bookingData.balanceDue || 0;
        let transactionDescription = '';

        if (type === 'charge') {
            newBalanceDue += amount;
            transactionDescription = window.prompt('Enter charge description (e.g., "Minibar", "Laundry"):') || 'Other Charge';
            showMessage(`Charge of $${amount.toFixed(2)} added to booking.`, 'success');
        } else if (type === 'payment') {
            newBalanceDue -= amount;
            transactionDescription = window.prompt('Enter payment description (e.g., "Cash", "Card"):') || 'Payment Received';
            showMessage(`Payment of $${amount.toFixed(2)} recorded for booking.`, 'success');
        }

        // Record transaction
        const transactionData = {
            type: type,
            amount: amount,
            description: transactionDescription,
            date: currentHotelDate, // Use current hotel date for transaction date
            timestamp: serverTimestamp()
        };
        await addDoc(collection(bookingRef, 'transactions'), transactionData);

        await updateDoc(bookingRef, { balanceDue: newBalanceDue });
    };

    // Function to generate invoice
    const generateInvoice = async (bookingId) => {
        if (!db || !userId) {
            showMessage('Database not ready.', 'error');
            return;
        }

        try {
            const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId);
            const bookingDocSnap = await getDoc(bookingRef);

            if (!bookingDocSnap.exists()) {
                showMessage('Booking not found.', 'error');
                return;
            }

            const bookingData = { id: bookingDocSnap.id, ...bookingDocSnap.data() };

            // Fetch all transactions for this booking
            const transactionsRef = collection(bookingRef, 'transactions');
            const transactionsSnap = await getDocs(transactionsRef);
            const fetchedTransactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setInvoiceBookingData(bookingData);
            setInvoiceTransactions(fetchedTransactions);
            setShowInvoiceModal(true);
        } catch (e) {
            console.error("Error generating invoice:", e);
            showMessage(`Failed to generate invoice: ${e.message}`, 'error');
        }
    };


    // --- NEW: Website Booking Processing Functions ---
    const handleAcceptWebsiteBooking = async (websiteBooking) => {
        if (!db || !userId) {
            showMessage('Database not ready. Please try again.', 'error');
            return;
        }

        const matchingRooms = rooms.filter(r => r.type === websiteBooking.roomTypeRequested && r.status === 'available');

        if (matchingRooms.length === 0) {
            showMessage(`No available rooms of type "${websiteBooking.roomTypeRequested}" to assign. Please add or free up rooms.`, 'error');
            return;
        }

        const selectedRoom = matchingRooms[0];

        const isRoomAvailable = await checkAvailabilityForBooking(
            selectedRoom.id,
            websiteBooking.checkInDate,
            websiteBooking.checkOutDate
        );

        if (!isRoomAvailable) {
            showMessage(`The selected room (${selectedRoom.roomNumber}) is no longer available for these dates. Please try another room or date.`, 'error');
            return;
        }

        try {
            // 1. Add to the main bookings collection
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/bookings`), {
                guestName: websiteBooking.guestName,
                guestEmail: websiteBooking.guestEmail,
                checkInDate: websiteBooking.checkInDate,
                checkOutDate: websiteBooking.checkOutDate,
                roomType: websiteBooking.roomTypeRequested,
                roomId: selectedRoom.id,
                roomNumber: selectedRoom.roomNumber,
                paxCount: websiteBooking.paxCount,
                specialRequests: websiteBooking.specialRequests || '',
                status: 'confirmed', // Accepted website bookings start as confirmed
                totalPrice: selectedRoom.price * (Math.ceil((new Date(websiteBooking.checkOutDate) - new Date(websiteBooking.checkInDate)) / (1000 * 60 * 60 * 24))),
                balanceDue: selectedRoom.price * (Math.ceil((new Date(websiteBooking.checkOutDate) - new Date(websiteBooking.checkInDate)) / (1000 * 60 * 60 * 24))), // Initial balance due
                createdAt: serverTimestamp(),
                processedFromWebsiteBookingId: websiteBooking.id
            });

            // 2. Update the status of the original website booking
           const websiteBookingRef = doc(db, `artifacts/${appId}/users/public/webbookings`, websiteBooking.id);
            await updateDoc(websiteBookingRef, {
                status: 'accepted',
                processedAt: serverTimestamp(),
                processedBy: userId
            });
            await deleteDoc(websiteBookingRef);
            showMessage('Website booking accepted and moved to main bookings!', 'success');
        } catch (e) {
            console.error("Error accepting website booking:", e);
            showMessage(`Failed to accept booking: ${e.message}`, 'error');
        }
    };

   const handleRejectWebsiteBooking = async (websiteBookingId) => {
    if (!db || !userId) {
        showMessage('Database not ready. Please try again.', 'error');
        return;
    }

    if (window.confirm("Are you sure you want to reject this website booking request?")) {
        try {
            const websiteBookingRef = doc(db, `artifacts/${appId}/users/public/webbookings`, websiteBookingId);
            await updateDoc(websiteBookingRef, {
                status: 'rejected',
                processedAt: serverTimestamp(),
                processedBy: userId
            });
            await deleteDoc(websiteBookingRef); // <-- This line deletes the booking after marking as rejected
            showMessage('Website booking rejected.', 'success');
        } catch (e) {
            console.error("Error rejecting website booking:", e);
            showMessage(`Failed to reject booking: ${e.message}`, 'error');
        }
    }
};

    // --- LLM Integration: Generate Guest Message ---
    const generateGuestMessage = async (booking, messageType) => {
        setIsDrafting(true);
        setDraftedMessageContent('');
        let prompt = "";
        let title = "";

        if (messageType === 'welcome') {
            title = "Drafted Welcome Message";
            prompt = `Draft a warm welcome message for a hotel guest. Keep it concise, friendly, and professional.
            Include their name, room type, check-in date, and check-out date.
            Encourage them to let us know if they need anything during their stay.
            
            Guest Name: ${booking.guestName}
            Room Type: ${booking.roomType || booking.roomTypeRequested || 'N/A'}
            Check-in Date: ${booking.checkInDate}
            Check-out Date: ${booking.checkOutDate}
            `;
        } else if (messageType === 'specialRequest') {
            title = "Drafted Special Request Response";
            prompt = `Draft a polite and helpful response to a hotel guest's special request.
            Acknowledge their request and state how the hotel plans to fulfill it. If it's not fully possible, offer a reasonable alternative.
            Keep the tone courteous and customer-focused.
            
            Guest Name: ${booking.guestName}
            Room Type: ${booking.roomType || booking.roomTypeRequested || 'N/A'}
            Special Request: ${booking.specialRequests || 'No specific details provided.'}
            `;
            if (!booking.specialRequests) {
                prompt += `\nNote: The special request field was empty. Please provide a more specific request in the prompt if available.`;
            }
        } else if (messageType === 'followUp') {
            title = "Drafted Follow-Up Message";
            prompt = `Draft a polite follow-up message for a hotel guest after their stay.
            Thank them for staying with us and invite them to leave feedback or return in the future.
            
            Guest Name: ${booking.guestName}
            Check-out Date: ${booking.checkOutDate}
            `;
        }

        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiKey = "";
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                setDraftedMessageContent(result.candidates[0].content.parts[0].text);
                setDraftMessageTitle(title);
                setShowDraftModal(true);
            } else {
                showMessage('Failed to generate message. No valid response from LLM.', 'error');
            }
        } catch (e) {
            console.error("Error calling Gemini API:", e);
            showMessage(`Error generating message: ${e.message}`, 'error');
        } finally {
            setIsDrafting(false);
        }
    };

    // --- End of Day Process ---
    const handleEndOfDayProcess = async () => {
        if (!db || !userId || !currentHotelDate) {
            showMessage('Database or current hotel date not ready.', 'error');
            return;
        }

        setIsProcessingEndOfDay(true);
        showMessage('Starting End of Day process...', 'info');

        try {
            const todayDate = new Date(currentHotelDate);
            const nextDayDate = new Date(todayDate);
            nextDayDate.setDate(todayDate.getDate() + 1);
            const nextHotelDate = nextDayDate.toISOString().substring(0, 10);

            // Fetch current settings
            const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/hotel_settings`, 'settings');
            // Using getDoc here as we expect a single document, not a query of a collection.
            const settingsSnap = await getDoc(settingsRef);
            const currentSettings = settingsSnap.exists() ? settingsSnap.data() : { cityLedgerBalance: 0 };
            const cityLedgerOpeningBalance = currentSettings.cityLedgerBalance || 0;

            let totalSalesToday = 0;
            let totalAccommodationChargesDaily = 0;
            let totalOtherChargesDaily = 0;
            let totalPaymentsReceivedDaily = 0;
            let roomsSoldTodayCount = 0;
            let paxCountToday = 0;

            const allBookings = await getDocs(collection(db, `artifacts/${appId}/users/${userId}/bookings`));

            for (const bookingDoc of allBookings.docs) {
                const bookingData = bookingDoc.data();
                const bookingId = bookingDoc.id;
                const checkInDate = new Date(bookingData.checkInDate);
                const checkOutDate = new Date(bookingData.checkOutDate);

                // Add daily accommodation charge if checked-in and not checked out
                if (bookingData.status === 'checkedIn' && todayDate >= checkInDate && todayDate < checkOutDate) {
                    const roomPrice = rooms.find(r => r.id === bookingData.roomId)?.price || 0;
                    totalAccommodationChargesDaily += roomPrice;
                    totalSalesToday += roomPrice;

                    // Update booking balance for daily accommodation
                    const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId);
                    await updateDoc(bookingRef, {
                        balanceDue: (bookingData.balanceDue || 0) + roomPrice
                    });
                     // Record accommodation transaction
                    const accommodationTxn = {
                        type: 'charge',
                        amount: roomPrice,
                        description: `Accommodation Charge (${currentHotelDate})`,
                        date: currentHotelDate,
                        timestamp: serverTimestamp()
                    };
                    await addDoc(collection(bookingRef, 'transactions'), accommodationTxn);
                }

                // Process transactions for the current hotel date
                const transactionsRef = collection(bookingDoc.ref, 'transactions');
                // Removed orderBy for transactions as it requires index and was not explicitly requested
                const qTransactions = query(transactionsRef, where('date', '==', currentHotelDate));
                const transactionsSnap = await getDocs(qTransactions);

                transactionsSnap.forEach(transactionDoc => {
                    const transaction = transactionDoc.data();
                    // Ensure description check is correct
                    if (transaction.type === 'charge' && transaction.description !== `Accommodation Charge (${currentHotelDate})`) {
                        totalOtherChargesDaily += transaction.amount;
                        totalSalesToday += transaction.amount;
                    } else if (transaction.type === 'payment') {
                        totalPaymentsReceivedDaily += transaction.amount;
                    }
                });

                // Update rooms sold and pax count for today
                if (bookingData.status === 'checkedIn' && todayDate >= checkInDate && todayDate < checkOutDate) {
                    roomsSoldTodayCount++;
                    paxCountToday += bookingData.paxCount || 0;
                }

                // Handle check-outs at end of day, if not manually checked out already
                // Only process if the booking is checkedIn and the checkOutDate matches today's date
                // and the balance is zero (to prevent automated checkout with balance due)
                if (bookingData.status === 'checkedIn' && todayDate.toDateString() === checkOutDate.toDateString()) {
                    if (bookingData.balanceDue <= 0) { // Only auto-checkout if balance is paid
                        const bookingRef = doc(db, `artifacts/${appId}/users/${userId}/bookings`, bookingId);
                        const roomRef = doc(db, `artifacts/${appId}/users/${userId}/rooms`, bookingData.roomId);

                        await updateDoc(bookingRef, {
                            status: 'checkedOut',
                            checkedOutAt: serverTimestamp()
                        });
                        await updateDoc(roomRef, { status: 'available' }); // Make room available
                        showMessage(`Booking ${bookingData.guestName} auto-checked out due to date.`, 'info');
                    } else {
                        showMessage(`Booking ${bookingData.guestName} could not be auto-checked out. Outstanding balance of $${bookingData.balanceDue.toFixed(2)} is due.`, 'warning');
                    }
                }
            }

            const cityLedgerClosingBalance = cityLedgerOpeningBalance + totalSalesToday - totalPaymentsReceivedDaily;

            // Save daily summary
            const dailySummaryDocRef = doc(db, `artifacts/${appId}/users/${userId}/daily_hotel_summary`, currentHotelDate);
            await setDoc(dailySummaryDocRef, {
                date: currentHotelDate,
                totalSalesDay: totalSalesToday,
                roomsSoldDay: roomsSoldTodayCount,
                paxCountDay: paxCountToday,
                cityLedgerOpeningBalance: cityLedgerOpeningBalance,
                cityLedgerClosingBalance: cityLedgerClosingBalance,
                totalAccommodationChargesDaily: totalAccommodationChargesDaily,
                otherChargesDaily: totalOtherChargesDaily,
                totalPaymentsReceivedDaily: totalPaymentsReceivedDaily,
                processedAt: serverTimestamp()
            }, { merge: true });

            // Update hotel settings for next day
            await updateDoc(settingsRef, {
                currentHotelDate: nextHotelDate,
                cityLedgerBalance: cityLedgerClosingBalance,
                lastProcessedEndOfDay: serverTimestamp()
            });

            showMessage(`End of Day process for ${currentHotelDate} completed successfully!`, 'success');
        } catch (e) {
            console.error("Error during End of Day process:", e);
            showMessage(`End of Day process failed: ${e.message}`, 'error');
        } finally {
            setIsProcessingEndOfDay(false);
        }
    };

    // Initialize rooms if empty (10 rooms total) and hotel settings
   useEffect(() => {
    const initializeData = async () => {
        if (!db || !userId) return;

        // Only initialize hotel settings if not present, but DO NOT clear or re-initialize rooms/bookings
        const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/hotel_settings`, 'settings');
        const settingsSnap = await getDocs(query(collection(db, `artifacts/${appId}/users/${userId}/hotel_settings`)));
        if (settingsSnap.empty) {
            await setDoc(settingsRef, {
                currentHotelDate: new Date().toISOString().substring(0, 10),
                cityLedgerBalance: 0,
                lastProcessedEndOfDay: null
            });
            console.log("Hotel settings initialized.");
        }
        // Do NOT auto-initialize or clear rooms/bookings here!
    };

    if (isAuthReady) {
        initializeData();
    }
}, [db, userId, isAuthReady]);

    // Fetch Hotel Settings and Daily Summaries in real-time
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        // Listen to hotel settings
        const settingsRef = doc(db, `artifacts/${appId}/users/${userId}/hotel_settings`, 'settings');
        const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCurrentHotelDate(data.currentHotelDate);
                setCityLedgerBalance(data.cityLedgerBalance || 0);
            } else {
                // If settings document doesn't exist, it will be created by initializeData
                setCurrentHotelDate(new Date().toISOString().substring(0, 10));
                setCityLedgerBalance(0);
            }
        }, (error) => {
            console.error("Error fetching hotel settings:", error);
            showMessage('Error loading hotel settings.', 'error');
        });

        // Listen to daily_hotel_summary for reports and dashboard earnings
        const dailySummaryRef = collection(db, `artifacts/${appId}/users/${userId}/daily_hotel_summary`);
        const unsubscribeDailySummary = onSnapshot(dailySummaryRef, (snapshot) => {
            const fetchedSummaries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setDailySummaries(fetchedSummaries);
            // Update dashboard earnings for current day
            const todaySummary = fetchedSummaries.find(s => s.id === currentHotelDate);
            setEarningsOfTheDay(todaySummary?.totalSalesDay || 0);
            setRoomsSoldDay(todaySummary?.roomsSoldDay || 0);
            setPaxCountDay(todaySummary?.paxCountDay || 0);
        }, (error) => {
            console.error("Error fetching daily summaries:", error);
            showMessage('Error loading daily reports.', 'error');
        });


        return () => {
            unsubscribeSettings();
            unsubscribeDailySummary();
        };
    }, [db, userId, isAuthReady, currentHotelDate]); // Dependency on currentHotelDate to update earnings for current day


    // Fetch Rooms in real-time
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        const roomsRef = collection(db, `artifacts/${appId}/users/${userId}/rooms`);
        const unsubscribe = onSnapshot(roomsRef, (snapshot) => {
            const fetchedRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRooms(fetchedRooms);
        }, (error) => {
            console.error("Error fetching rooms:", error);
            showMessage('Error loading rooms.', 'error');
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady]);

    // Fetch Bookings in real-time
    useEffect(() => {
        if (!db || !userId || !isAuthReady) return;

        const bookingsRef = collection(db, `artifacts/${appId}/users/${userId}/bookings`);
        const unsubscribe = onSnapshot(bookingsRef, (snapshot) => {
            const fetchedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBookings(fetchedBookings);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            showMessage('Error loading bookings.', 'error');
        });

        return () => unsubscribe();
    }, [db, userId, isAuthReady]);

  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;
    if (rooms.length === 0 || bookings.length === 0) return;

    const syncRoomStatuses = async () => {
        const today = new Date(currentHotelDate);
        today.setHours(0, 0, 0, 0);

        // 1. Find all room IDs that should be "occupied"
        const occupiedRoomIds = new Set();
        for (const booking of bookings) {
            if (booking.status === 'checkedIn' && booking.roomId) {
                const checkIn = new Date(booking.checkInDate);
                const checkOut = new Date(booking.checkOutDate);
                checkIn.setHours(0, 0, 0, 0);
                checkOut.setHours(0, 0, 0, 0);
                if (today >= checkIn && today < checkOut) {
                    occupiedRoomIds.add(booking.roomId);
                }
            }
        }

        // 2. Update rooms only if status needs to change
        await Promise.all(rooms.map(async (room) => {
            let newStatus = occupiedRoomIds.has(room.id) ? 'occupied' : 'available';
            if (room.status !== newStatus) {
                await updateDoc(doc(db, `artifacts/${appId}/users/${userId}/rooms`, room.id), {
                    status: newStatus
                });
            }
        }));
    };

    syncRoomStatuses();
    // eslint-disable-next-line
}, [db, userId, isAuthReady, rooms, bookings, currentHotelDate]);
    // NEW: Fetch Website Bookings in real-time
   
    // Show loading spinner if auth is not ready
    if (!isAuthReady) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
                <div style={{ fontSize: '1.75rem', color: '#4b5563' }}>Loading dashboard...</div>
            </div>
        );
    }

    // Show login form if not authenticated
   if (!userId) {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6' }}>
            <form onSubmit={handleLogin} style={{ background: '#fff', padding: '2rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', minWidth: 320 }}>
                <h2 style={{ marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.25rem' }}>Sign In</h2>
                <input
                    type="email"
                    placeholder="Email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ccc' }}
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    style={{ width: '100%', marginBottom: '1rem', padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid #ccc' }}
                />
                {loginError && <div style={{ color: '#dc2626', marginBottom: '1rem' }}>{loginError}</div>}
                <button
                    type="submit"
                    style={{
                        width: '100%',
                        background: '#2563eb',
                        color: '#fff',
                        padding: '0.5rem',
                        borderRadius: '0.25rem',
                        border: 'none',
                        fontWeight: 'bold',
                        marginBottom: '0.5rem',
                        opacity: isSigningIn ? 0.7 : 1,
                        cursor: isSigningIn ? 'not-allowed' : 'pointer'
                    }}
                    disabled={isSigningIn}
                >
                    {isSigningIn ? (
                        <span>
                            <svg style={{ verticalAlign: 'middle', marginRight: 8 }} width="20" height="20" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#fff" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="#fff" d="M4 12a8 8 0 018-8v8z"></path>
                            </svg>
                            Signing In...
                        </span>
                    ) : 'Sign In'}
                </button>
            </form>
        </div>
    );
}
if (!userRole) {
    // Still loading role info
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
            <div style={{ fontSize: '1.75rem', color: '#4b5563' }}>Checking permissions...</div>
        </div>
    );
}

if (userRole !== "receptionist" && userRole !== "finance" && userRole !== "admin") {
    return (
        <div style={{ color: "#dc2626", fontWeight: "bold", fontSize: "1.25rem", padding: "2rem" }}>
            You do not have permission to access this dashboard.
        </div>
    );
}
    // ...your existing return (dashboard, nav, etc.)...

    // Example: Add logout button in your sidebar nav
    // <button onClick={handleLogout} style={{ marginTop: '1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.375rem', padding: '0.5rem 1rem', fontWeight: 'bold' }}>Logout</button>



 



    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6', display: 'flex' }}>
            <nav style={{ width: '16rem', backgroundColor: '#1a73e8', color: '#fff', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>Hotel Admin</div>
                <p style={{ fontSize: '0.875rem', color: '#e0e0e0', marginBottom: '1rem', wordBreak: 'break-all' }}>User ID: {userId}</p>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => setCurrentView('dashboard')}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: currentView === 'dashboard' ? '#1c5eab' : 'transparent',
                                color: '#fff',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Dashboard
                        </button>
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => setCurrentView('rooms')}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: currentView === 'rooms' ? '#1c5eab' : 'transparent',
                                color: '#fff',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Room Management
                        </button>
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => setCurrentView('bookings')}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: currentView === 'bookings' ? '#1c5eab' : 'transparent',
                                color: '#fff',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Booking Management
                        </button>
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => setCurrentView('websiteBookings')}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: currentView === 'websiteBookings' ? '#1c5eab' : 'transparent',
                                color: '#fff',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Website Bookings ({websiteBookings.filter(b => b.status === 'pending').length})
                        </button>
                    </li>
                    <li style={{ marginBottom: '0.5rem' }}>
                        <button
                            onClick={() => setCurrentView('reports')}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                backgroundColor: currentView === 'reports' ? '#1c5eab' : 'transparent',
                                color: '#fff',
                                transition: 'background-color 0.2s'
                            }}
                        >
                            Reports
                        </button>
                    </li>
                 {userRole === 'admin' && (
  <li style={{ marginBottom: '0.5rem' }}>
    <button
      onClick={() => setCurrentView('admin')}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: 'none',
        cursor: 'pointer',
        backgroundColor: currentView === 'admin' ? '#1c5eab' : 'transparent',
        color: '#fff',
        transition: 'background-color 0.2s'
      }}
    >
      Admin Panel
    </button>
  </li>
)}


                </ul>
                 <button
        onClick={handleLogout}
        style={{
            marginTop: '1rem',
            background: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '0.375rem',
            padding: '0.5rem 1rem',
            fontWeight: 'bold',
            cursor: 'pointer'
        }}
    >
        Logout
    </button>
                <a
        href="/hotel.html"
        target="_blank"
        rel="noopener noreferrer"
        style={{
            backgroundColor: '#4338ca',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            textDecoration: 'none',
            fontWeight: 'bold',
            marginTop: '1rem',
            display: 'inline-block',
            textAlign: 'center'
        }}
    >
        View Hotel Website
    </a>
            </nav>

            <main style={{ flex: '1', padding: '1.5rem' }}>
                {currentView === 'dashboard' && <DashboardOverview
                    rooms={rooms}
                    bookings={bookings}
                    websiteBookings={websiteBookings}
                    setCurrentView={setCurrentView}
                    currentHotelDate={currentHotelDate}
                    earningsOfTheDay={earningsOfTheDay}
                    roomsSoldDay={roomsSoldDay}
                    paxCountDay={paxCountDay}
                    cityLedgerBalance={cityLedgerBalance}
                    handleEndOfDayProcess={handleEndOfDayProcess}
                    isProcessingEndOfDay={isProcessingEndOfDay}
                />}
                {currentView === 'rooms' && <RoomsManagement rooms={rooms} setShowRoomsModal={setShowRoomsModal} setEditRoomData={setEditRoomData} handleDeleteRoom={handleDeleteRoom} />}
                {currentView === 'bookings' && <BookingsManagement
                    bookings={bookings}
                    setShowBookingsModal={setShowBookingsModal}
                    setEditBookingData={setEditBookingData}
                    handleDeleteBooking={handleDeleteBooking}
                    generateGuestMessage={generateGuestMessage}
                    isDrafting={isDrafting}
                    rooms={rooms}
                    addChargeOrPaymentToBooking={addChargeOrPaymentToBooking}
                    checkInGuest={checkInGuest}
                    checkOutGuest={checkOutGuest}
                    generateInvoice={generateInvoice}
                />}
                {currentView === 'websiteBookings' && <WebsiteBookingsManagement websiteBookings={websiteBookings} handleAcceptWebsiteBooking={handleAcceptWebsiteBooking} handleRejectWebsiteBooking={handleRejectWebsiteBooking} />}

      {currentView === 'reports' && (
        (userRole === "finance" || userRole === "admin") ? (
            <ReportsManagement
                dailySummaries={dailySummaries}
                currentHotelDate={currentHotelDate}
                cityLedgerBalance={cityLedgerBalance}
                earningsOfTheDay={earningsOfTheDay}
                handleEndOfDayProcess={handleEndOfDayProcess}
                isProcessingEndOfDay={isProcessingEndOfDay}
                onShowCityLedger={handleShowCityLedger}
            />
        ) : (
            <div style={{ color: "#dc2626", fontWeight: "bold", fontSize: "1.25rem", padding: "2rem" }}>
                Only finance staff can access reports.
            </div>
        )
      )}
{currentView === 'admin' && userRole === 'admin' && <AdminPanel />}


            </main>

            {showRoomsModal && (
                <RoomModal
                    room={editRoomData}
                    onClose={() => { setShowRoomsModal(false); setEditRoomData(null); }}
                    onSave={handleAddOrUpdateRoom}
                />
            )}

            {showBookingsModal && (
                <BookingModal
                    booking={editBookingData}
                    onClose={() => { setShowBookingsModal(false); setEditBookingData(null); }}
                    onSave={handleAddOrUpdateBooking}
                    rooms={rooms}
                    onDraftMessage={generateGuestMessage}
                    isDrafting={isDrafting}
                />
            )}

            {showInvoiceModal && (
                <InvoiceModal
                    booking={invoiceBookingData}
                    transactions={invoiceTransactions}
                    onClose={() => { setShowInvoiceModal(false); setInvoiceBookingData(null); setInvoiceTransactions([]); }}
                />
            )}
{showCityLedgerModal && (
    <CityLedgerModal
        transactions={cityLedgerTransactions}
        onClose={() => setShowCityLedgerModal(false)}
    />
)}
            <MessageBox message={message} type={messageType} onClose={closeMessage} />
            {showDraftModal && (
                <DraftMessageModal
                    title={draftMessageTitle}
                    message={draftedMessageContent}
                    onClose={() => setShowDraftModal(false)}
                />
            )}
        </div>
    );

};
const WrappedApp = () => (
    <AppProvider>
        <App />
    </AppProvider>
);

export default WrappedApp;

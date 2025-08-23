import React from 'react';
import { AppProvider } from './context/AppContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRoutes from './AppRoutes';
import LandingPage from './views/LandingPage';

const App = () => {
    // This logic separates the public-facing landing page from the internal application.
    const isAppRoute = window.location.pathname === '/app.html';

    if (isAppRoute) {
        // If the user is on /app.html, load the full application with its context.
        return (
            <LanguageProvider>
                <AppProvider>
                    <AppRoutes />
                </AppProvider>
            </LanguageProvider>
        );
    }

    // Otherwise, show the new, animated landing page.
    return (
        <LanguageProvider>
            <LandingPage />
        </LanguageProvider>
    );
};

export default App;

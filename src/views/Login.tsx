import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MailIcon, KeyIcon } from '../components/Icons';

const LoginScreen = () => {
    const { login, isLoading } = useAppContext();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        login(email, password);
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 bg-login-image">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    {/* Main logo for consistent branding */}
                    <div className="inline-block p-4">
                        <img src="/shuhna-logo-main.png" alt="Shuhna Express Logo" className="w-24 h-24 object-contain" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-foreground mt-4">Shuhna Express</h1>
                    <p className="mt-2 text-muted-foreground">Your world, delivered.</p>
                </div>

                <div className="bg-card/60 dark:bg-card/80 backdrop-blur-md p-8 rounded-2xl border border-border shadow-2xl">
                    <h2 className="text-2xl font-bold text-foreground">Portal Login</h2>
                    <p className="mt-2 text-sm text-muted-foreground">Enter your credentials to access your account.</p>

                    <form onSubmit={handleLogin} className="mt-8 space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1">Email Address</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MailIcon className="h-5 w-5 text-muted-foreground" />
                                </span>
                                <input 
                                    id="email" 
                                    type="email" 
                                    value={email} 
                                    onChange={e => setEmail(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-3 bg-background/60 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/80 focus:border-primary transition" 
                                    placeholder="you@example.com" 
                                    required 
                                />
                            </div>
                        </div>
                        
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1">Password</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                    <KeyIcon className="h-5 w-5 text-muted-foreground" />
                                </span>
                                <input 
                                    id="password" 
                                    type="password" 
                                    value={password} 
                                    onChange={e => setPassword(e.target.value)} 
                                    className="w-full pl-10 pr-4 py-3 bg-background/60 border border-border rounded-lg text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary/80 focus:border-primary transition" 
                                    placeholder="••••••••" 
                                    required 
                                />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full flex justify-center bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg shadow-lg hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-primary/50 transition duration-300 disabled:bg-primary/50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    Test with: <code className="bg-card text-secondary-foreground px-1.5 py-0.5 rounded-md">admin@flash.com</code> / <code className="bg-card text-secondary-foreground px-1.5 py-0.5 rounded-md">password123</code>
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;
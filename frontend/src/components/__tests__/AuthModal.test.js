import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import AuthModal from '../AuthModal';

// Mock axios
jest.mock('axios');

describe('AuthModal Component', () => {
    const mockProps = {
        isOpen: true,
        onClose: jest.fn(),
        onLoginSuccess: jest.fn(),
        mode: 'login'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders login form when mode is login', () => {
        render(<AuthModal {...mockProps} />);
        
        expect(screen.getByLabelText(/usuario|username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/contraseña|password/i)).toBeInTheDocument();
    });

    it('renders register form when mode is register', () => {
        const registerProps = { ...mockProps, mode: 'register' };
        render(<AuthModal {...registerProps} />);
        
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
        const closedProps = { ...mockProps, isOpen: false };
        const { container } = render(<AuthModal {...closedProps} />);
        
        expect(container.firstChild).toBeNull();
    });

    it('handles input changes', () => {
        render(<AuthModal {...mockProps} />);
        
        const usernameInput = screen.getByLabelText(/usuario|username/i);
        fireEvent.change(usernameInput, { target: { value: 'testuser' } });
        
        expect(usernameInput.value).toBe('testuser');
    });

    it('validates required fields', async () => {
        render(<AuthModal {...mockProps} />);
        
        const submitButton = screen.getByRole('button', { name: /iniciar sesión|login/i });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
            // Should show validation error or not call onLoginSuccess
            expect(mockProps.onLoginSuccess).not.toHaveBeenCalled();
        });
    });

    it('calls onClose when close button is clicked', () => {
        render(<AuthModal {...mockProps} />);
        
        const closeButton = screen.getByRole('button', { name: /cerrar|close/i });
        fireEvent.click(closeButton);
        
        expect(mockProps.onClose).toHaveBeenCalled();
    });

    it('switches between login and register modes', () => {
        const { rerender } = render(<AuthModal {...mockProps} />);
        
        expect(screen.getByText(/iniciar sesión|login/i)).toBeInTheDocument();
        
        rerender(<AuthModal {...mockProps} mode="register" />);
        
        expect(screen.getByText(/registrarse|register/i)).toBeInTheDocument();
    });
});

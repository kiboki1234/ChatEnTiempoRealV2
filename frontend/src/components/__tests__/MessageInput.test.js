import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageInput from '../MessageInput';

// Mock socket service
jest.mock('../../services/socketService', () => ({
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn()
}));

describe('MessageInput Component', () => {
    const mockProps = {
        onSendMessage: jest.fn(),
        currentRoom: 'general',
        username: 'testuser',
        replyTo: null,
        onCancelReply: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders message input', () => {
        render(<MessageInput {...mockProps} />);
        
        const input = screen.getByPlaceholderText(/escribe un mensaje/i);
        expect(input).toBeInTheDocument();
    });

    it('handles text input', () => {
        render(<MessageInput {...mockProps} />);
        
        const input = screen.getByPlaceholderText(/escribe un mensaje/i);
        fireEvent.change(input, { target: { value: 'Hello, World!' } });
        
        expect(input.value).toBe('Hello, World!');
    });

    it('calls onSendMessage when send button is clicked', async () => {
        render(<MessageInput {...mockProps} />);
        
        const input = screen.getByPlaceholderText(/escribe un mensaje/i);
        fireEvent.change(input, { target: { value: 'Test message' } });
        
        const sendButton = screen.getByRole('button', { name: /enviar|send/i });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
            expect(mockProps.onSendMessage).toHaveBeenCalled();
        });
    });

    it('clears input after sending message', async () => {
        render(<MessageInput {...mockProps} />);
        
        const input = screen.getByPlaceholderText(/escribe un mensaje/i);
        fireEvent.change(input, { target: { value: 'Test message' } });
        
        const sendButton = screen.getByRole('button', { name: /enviar|send/i });
        fireEvent.click(sendButton);
        
        await waitFor(() => {
            expect(input.value).toBe('');
        });
    });

    it('does not send empty messages', () => {
        render(<MessageInput {...mockProps} />);
        
        const sendButton = screen.getByRole('button', { name: /enviar|send/i });
        fireEvent.click(sendButton);
        
        expect(mockProps.onSendMessage).not.toHaveBeenCalled();
    });

    it('shows reply indicator when replying', () => {
        const replyProps = {
            ...mockProps,
            replyTo: {
                username: 'otheruser',
                message: 'Original message'
            }
        };
        
        render(<MessageInput {...replyProps} />);
        
        expect(screen.getByText(/respondiendo a/i)).toBeInTheDocument();
        expect(screen.getByText(/otheruser/i)).toBeInTheDocument();
    });

    it('calls onCancelReply when cancel button is clicked', () => {
        const replyProps = {
            ...mockProps,
            replyTo: {
                username: 'otheruser',
                message: 'Original message'
            }
        };
        
        render(<MessageInput {...replyProps} />);
        
        const cancelButton = screen.getByRole('button', { name: /cancelar|cancel/i });
        fireEvent.click(cancelButton);
        
        expect(mockProps.onCancelReply).toHaveBeenCalled();
    });
});

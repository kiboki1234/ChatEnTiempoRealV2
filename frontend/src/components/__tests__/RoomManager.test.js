import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoomManager from '../RoomManager';

describe('RoomManager Component', () => {
    const mockProps = {
        currentRoom: 'general',
        onJoinRoom: jest.fn(),
        onCreateRoom: jest.fn(),
        onLeaveRoom: jest.fn(),
        username: 'testuser',
        isAuthenticated: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders room manager', () => {
        render(<RoomManager {...mockProps} />);
        
        expect(screen.getByText(/salas|rooms/i)).toBeInTheDocument();
    });

    it('displays current room', () => {
        render(<RoomManager {...mockProps} />);
        
        expect(screen.getByText(/general/i)).toBeInTheDocument();
    });

    it('shows create room button for authenticated users', () => {
        render(<RoomManager {...mockProps} />);
        
        const createButton = screen.getByRole('button', { name: /crear sala|create room/i });
        expect(createButton).toBeInTheDocument();
    });

    it('hides create room button for guests', () => {
        const guestProps = { ...mockProps, isAuthenticated: false };
        render(<RoomManager {...guestProps} />);
        
        const createButton = screen.queryByRole('button', { name: /crear sala|create room/i });
        expect(createButton).not.toBeInTheDocument();
    });

    it('opens create room modal when button is clicked', () => {
        render(<RoomManager {...mockProps} />);
        
        const createButton = screen.getByRole('button', { name: /crear sala|create room/i });
        fireEvent.click(createButton);
        
        expect(screen.getByText(/nueva sala|new room/i)).toBeInTheDocument();
    });

    it('calls onJoinRoom when joining a room', () => {
        render(<RoomManager {...mockProps} />);
        
        const roomPin = '123456';
        const joinInput = screen.getByPlaceholderText(/código de sala|room code/i);
        fireEvent.change(joinInput, { target: { value: roomPin } });
        
        const joinButton = screen.getByRole('button', { name: /unirse|join/i });
        fireEvent.click(joinButton);
        
        expect(mockProps.onJoinRoom).toHaveBeenCalledWith(roomPin);
    });

    it('calls onLeaveRoom when leaving current room', () => {
        const nonGeneralProps = { ...mockProps, currentRoom: '123456' };
        render(<RoomManager {...nonGeneralProps} />);
        
        const leaveButton = screen.getByRole('button', { name: /salir|leave/i });
        fireEvent.click(leaveButton);
        
        expect(mockProps.onLeaveRoom).toHaveBeenCalled();
    });

    it('validates room PIN format', () => {
        render(<RoomManager {...mockProps} />);
        
        const joinInput = screen.getByPlaceholderText(/código de sala|room code/i);
        fireEvent.change(joinInput, { target: { value: 'abc' } });
        
        const joinButton = screen.getByRole('button', { name: /unirse|join/i });
        fireEvent.click(joinButton);
        
        // Should not call onJoinRoom with invalid PIN
        expect(mockProps.onJoinRoom).not.toHaveBeenCalled();
    });
});

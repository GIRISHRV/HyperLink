
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PeerManager } from './peer-manager';

// Explicitly mock peerjs
vi.mock('peerjs', () => {
    // Define Mock classes inside the factory to avoid hoisting issues
    class MockDataConnection {
        open = true;
        peer = 'remote-peer-id';
        metadata = {};
        serialization = 'binary';
        reliable = true;
        label = 'mock-label';
        type = 'data';
        bufferSize = 0;
        peerConnection = {
            signalingState: 'stable',
            iceConnectionState: 'connected',
            iceGatheringState: 'complete',
            localDescription: { type: 'offer', sdp: '' },
            remoteDescription: { type: 'answer', sdp: '' },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            getStats: vi.fn().mockResolvedValue([]),
        };

        on(_event: string, _callback: Function) { return this; }
        off(_event: string, _callback?: Function) { return this; }
        send(_data: any) { }
        close() { this.open = false; }
    }

    // EventEmitter implementation for MockPeer
    class MockPeer extends Object {
        id: string;
        options: any;
        open = false;
        connections = {};
        disconnected = false;
        destroyed = false;
        _events: Record<string, Function[]> = {};

        constructor(id?: string | object, options?: object) {
            super();
            if (typeof id === 'object') {
                options = id;
                id = undefined;
            }
            this.id = (id as string) || 'mock-peer-id';
            this.options = options || {};

            // Auto-emit open after a tick
            setTimeout(() => {
                if (!this.destroyed) {
                    this.open = true;
                    this.emit('open', this.id);
                }
            }, 10);
        }

        on(event: string, callback: Function) {
            if (!this._events[event]) this._events[event] = [];
            this._events[event].push(callback);
            return this;
        }

        off(event: string, callback?: Function) {
            if (!this._events[event]) return this;
            if (callback) {
                this._events[event] = this._events[event].filter(cb => cb !== callback);
            } else {
                delete this._events[event];
            }
            return this;
        }

        emit(event: string, ...args: any[]) {
            if (this._events[event]) {
                this._events[event].forEach(cb => cb(...args));
            }
        }

        connect(_id: string, _options?: any) {
            return new MockDataConnection();
        }

        disconnect() {
            this.disconnected = true;
            this.emit('disconnected');
        }

        reconnect() {
            this.disconnected = false;
        }

        destroy() {
            this.destroyed = true;
            this.emit('close');
        }
    }

    return {
        default: vi.fn(function (id, options) {
            return new MockPeer(id, options);
        }),
        DataConnection: MockDataConnection
    };
});

describe('PeerManager', () => {
    let peerManager: PeerManager;
    const config = {
        host: 'localhost',
        port: 9000,
        path: '/myapp',
    };

    beforeEach(() => {
        // Clear all mocks and timers
        vi.clearAllMocks();
        vi.useFakeTimers();
        peerManager = new PeerManager(config);
    });

    afterEach(() => {
        peerManager.destroy();
        vi.useRealTimers();
    });

    it('should initialize with disconnected state', () => {
        expect(peerManager.getState()).toBe('disconnected');
    });

    it('should initialize Peer when calling initialize()', async () => {
        const initPromise = peerManager.initialize('test-id');

        // Fast-forward time to trigger the mock's setTimeout
        vi.advanceTimersByTime(50);

        const id = await initPromise;

        expect(id).toBe('test-id');
        expect(peerManager.getState()).toBe('connected');
        // All assertions passed
    });

    it('should return existing promise if initialization is already in progress', () => {
        const p1 = peerManager.initialize();
        const p2 = peerManager.initialize();
        expect(p1).toBe(p2);
    });

    it('should cleanup resources on destroy', async () => {
        const initPromise = peerManager.initialize();
        vi.advanceTimersByTime(50);
        await initPromise;

        peerManager.destroy();

        expect(peerManager.getState()).toBe('closed');
    });
});

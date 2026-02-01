"""
WebSocket connection manager for real-time communication
"""
from typing import Dict, List
from fastapi import WebSocket
import json
import asyncio


class ConnectionManager:
    """
    Manages WebSocket connections for game sessions
    """

    def __init__(self):
        # Store active connections: {game_session_id: {connection_id: websocket}}
        self.active_connections: Dict[int, Dict[str, WebSocket]] = {}

        # Store connection metadata: {connection_id: {session_id, team_id, role}}
        self.connection_metadata: Dict[str, Dict] = {}

    async def connect(
        self,
        websocket: WebSocket,
        session_id: int,
        connection_id: str,
        role: str = "player",
        team_id: int = None
    ):
        """
        Accept and store new WebSocket connection

        Args:
            websocket: WebSocket connection
            session_id: Game session ID
            connection_id: Unique connection identifier
            role: 'facilitator' or 'player'
            team_id: Team ID (for players)
        """
        await websocket.accept()

        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}

        self.active_connections[session_id][connection_id] = websocket
        self.connection_metadata[connection_id] = {
            "session_id": session_id,
            "team_id": team_id,
            "role": role
        }

    def disconnect(self, connection_id: str):
        """
        Remove WebSocket connection

        Args:
            connection_id: Connection identifier
        """
        if connection_id in self.connection_metadata:
            metadata = self.connection_metadata[connection_id]
            session_id = metadata["session_id"]

            if session_id in self.active_connections:
                if connection_id in self.active_connections[session_id]:
                    del self.active_connections[session_id][connection_id]

                # Clean up empty session
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]

            del self.connection_metadata[connection_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """
        Send message to specific WebSocket connection

        Args:
            message: Message dict
            websocket: Target WebSocket
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error sending personal message: {e}")

    async def send_to_team(self, message: dict, session_id: int, team_id: int):
        """
        Send message to all connections of a specific team

        Args:
            message: Message dict
            session_id: Game session ID
            team_id: Target team ID
        """
        if session_id not in self.active_connections:
            return

        for conn_id, websocket in self.active_connections[session_id].items():
            metadata = self.connection_metadata.get(conn_id, {})
            if metadata.get("team_id") == team_id:
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Error sending to team {team_id}: {e}")

    async def send_to_facilitator(self, message: dict, session_id: int):
        """
        Send message to facilitator of a session

        Args:
            message: Message dict
            session_id: Game session ID
        """
        if session_id not in self.active_connections:
            return

        for conn_id, websocket in self.active_connections[session_id].items():
            metadata = self.connection_metadata.get(conn_id, {})
            if metadata.get("role") == "facilitator":
                try:
                    await websocket.send_text(json.dumps(message))
                except Exception as e:
                    print(f"Error sending to facilitator: {e}")

    async def broadcast_to_session(self, message: dict, session_id: int):
        """
        Broadcast message to all connections in a game session

        Args:
            message: Message dict
            session_id: Game session ID
        """
        if session_id not in self.active_connections:
            return

        # Create list of tasks to send concurrently
        tasks = []
        for websocket in self.active_connections[session_id].values():
            tasks.append(self._send_message_safe(websocket, message))

        # Send all messages concurrently
        await asyncio.gather(*tasks, return_exceptions=True)

    async def _send_message_safe(self, websocket: WebSocket, message: dict):
        """
        Safely send message to websocket with error handling

        Args:
            websocket: Target WebSocket
            message: Message dict
        """
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            print(f"Error broadcasting message: {e}")

    async def broadcast_leaderboard_update(self, session_id: int, leaderboard: List[dict]):
        """
        Broadcast leaderboard update to all connections in session

        Args:
            session_id: Game session ID
            leaderboard: Leaderboard data
        """
        message = {
            "type": "leaderboard_update",
            "data": {
                "leaderboard": leaderboard
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_team_joined(self, session_id: int, team_data: dict):
        """
        Broadcast new team joined to all connections

        Args:
            session_id: Game session ID
            team_data: Team information
        """
        message = {
            "type": "team_joined",
            "data": {
                **team_data,
                "session_id": session_id
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_game_started(self, session_id: int):
        """
        Broadcast game started to all connections

        Args:
            session_id: Game session ID
        """
        message = {
            "type": "game_started",
            "data": {}
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_question_ready_for_dice(self, session_id: int, team_name: str):
        """
        Broadcast that a question is ready and team needs to roll dice

        Args:
            session_id: Game session ID
            team_name: Name of the team that needs to roll
        """
        message = {
            "type": "question_ready_for_dice",
            "data": {
                "team_name": team_name
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_dice_rolled(self, session_id: int, dice_data: dict):
        """
        Broadcast dice roll result to all connections

        Args:
            session_id: Game session ID
            dice_data: Dice roll information
        """
        message = {
            "type": "dice_rolled",
            "data": dice_data
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_question_served(
        self,
        session_id: int,
        question_data: dict,
        team_data: dict,
        round_number: int
    ):
        """
        Broadcast new question to all connections

        Args:
            session_id: Game session ID
            question_data: Question information
            team_data: Current team information
            round_number: Current round number
        """
        message = {
            "type": "question_served",
            "data": {
                "question": question_data,
                "current_team": team_data,
                "round_number": round_number
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_answer_submitted(
        self,
        session_id: int,
        team_id: int,
        team_name: str
    ):
        """
        Broadcast that answer was submitted

        Args:
            session_id: Game session ID
            team_id: Team ID
            team_name: Team name
        """
        message = {
            "type": "answer_submitted",
            "data": {
                "team_id": team_id,
                "team_name": team_name
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_answer_graded(
        self,
        session_id: int,
        team_id: int,
        is_correct: bool,
        points_awarded: int,
        correct_answer: str = None,
        team_name: str = None
    ):
        """
        Broadcast answer grading result

        Args:
            session_id: Game session ID
            team_id: Team ID
            is_correct: Whether answer was correct
            points_awarded: Points awarded
            correct_answer: The correct answer (for display)
            team_name: Team name (for display)
        """
        message = {
            "type": "answer_graded",
            "data": {
                "team_id": team_id,
                "team_name": team_name,
                "is_correct": is_correct,
                "points_awarded": points_awarded,
                "correct_answer": correct_answer
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_timer_started(self, session_id: int, duration: int):
        """
        Broadcast timer started

        Args:
            session_id: Game session ID
            duration: Timer duration in seconds
        """
        message = {
            "type": "timer_started",
            "data": {
                "duration": duration
            }
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_time_up(self, session_id: int):
        """
        Broadcast time's up

        Args:
            session_id: Game session ID
        """
        message = {
            "type": "time_up",
            "data": {}
        }
        await self.broadcast_to_session(message, session_id)

    async def broadcast_game_ended(self, session_id: int, winner_data: dict):
        """
        Broadcast game ended with winner

        Args:
            session_id: Game session ID
            winner_data: Winner information
        """
        message = {
            "type": "game_ended",
            "data": {
                "winner": winner_data
            }
        }
        await self.broadcast_to_session(message, session_id)

    def get_session_connections_count(self, session_id: int) -> int:
        """
        Get number of active connections for a session

        Args:
            session_id: Game session ID

        Returns:
            Number of connections
        """
        if session_id not in self.active_connections:
            return 0
        return len(self.active_connections[session_id])


# Global connection manager instance
manager = ConnectionManager()

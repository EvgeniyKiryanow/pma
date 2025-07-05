import { useEffect, useState } from 'react';

type Todo = {
    id: number;
    content: string;
    completed: boolean;
};

export default function RemindersTab() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');

    useEffect(() => {
        loadTodos();
    }, []);

    const loadTodos = async () => {
        const rawData = await window.electronAPI.getTodos();
        const data: Todo[] = rawData.map((item: any) => ({
            ...item,
            completed: Boolean(item.completed), // Приводимо number → boolean
        }));
        setTodos(data);
    };

    const handleAdd = async () => {
        if (!newTodo.trim()) return;
        await window.electronAPI.addTodo(newTodo.trim());
        setNewTodo('');
        loadTodos();
    };

    const handleToggle = async (id: number) => {
        await window.electronAPI.toggleTodo(id);
        loadTodos();
    };

    const handleDelete = async (id: number) => {
        await window.electronAPI.deleteTodo(id);
        loadTodos();
    };

    return (
        <div className="p-6 max-w-4xl mx-auto text-gray-800">
            <h2 className="text-3xl font-bold mb-6 text-blue-700">📝 Reminders</h2>

            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <label className="block text-sm font-semibold text-gray-600 mb-2">
                    Add a new reminder
                </label>
                <textarea
                    value={newTodo}
                    onChange={(e) => setNewTodo(e.target.value)}
                    rows={3}
                    placeholder="What do you want to be reminded about?"
                    className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-blue-500 text-sm"
                />
                <button
                    onClick={handleAdd}
                    className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md shadow transition"
                >
                    Add Reminder
                </button>
            </div>

            <ul className="space-y-4">
                {todos.map((todo) => (
                    <li
                        key={todo.id}
                        className={`flex justify-between items-start gap-4 bg-white p-4 rounded-md shadow border ${
                            todo.completed ? 'opacity-60' : ''
                        }`}
                    >
                        <div className="flex-1">
                            <p
                                className={`text-sm ${
                                    todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
                                }`}
                            >
                                {todo.content}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleToggle(todo.id)}
                                className={`text-xs font-medium px-3 py-1 rounded-md transition ${
                                    todo.completed
                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                        : 'bg-green-100 text-green-800 hover:bg-green-200'
                                }`}
                            >
                                {todo.completed ? 'Undone' : 'Done'}
                            </button>
                            <button
                                onClick={() => handleDelete(todo.id)}
                                className="text-xs font-medium px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

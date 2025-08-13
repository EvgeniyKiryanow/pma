// import { useEffect, useState } from 'react';
// import { useI18nStore } from '../stores/i18nStore';

// type Todo = {
//     id: number;
//     content: string;
//     completed: boolean;
// };

// export default function RemindersTab() {
//     const { t } = useI18nStore();
//     const [todos, setTodos] = useState<Todo[]>([]);
//     const [newTodo, setNewTodo] = useState('');

//     useEffect(() => {
//         loadTodos();
//     }, []);

//     const loadTodos = async () => {
//         const rawData = await window.electronAPI.getTodos();
//         const data: Todo[] = rawData.map((item: any) => ({
//             ...item,
//             completed: Boolean(item.completed),
//         }));
//         setTodos(data);
//     };

//     const handleAdd = async () => {
//         if (!newTodo.trim()) return;
//         await window.electronAPI.addTodo(newTodo.trim());
//         setNewTodo('');
//         loadTodos();
//     };

//     const handleToggle = async (id: number) => {
//         await window.electronAPI.toggleTodo(id);
//         loadTodos();
//     };

//     const handleDelete = async (id: number) => {
//         await window.electronAPI.deleteTodo(id);
//         loadTodos();
//     };

//     return (
//         <div className="p-6 max-w-4xl mx-auto text-gray-800">
//             <h2 className="text-3xl font-bold mb-6 text-blue-700">📝 {t('reminders.title')}</h2>

//             <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//                 <label className="block text-sm font-semibold text-gray-600 mb-2">
//                     {t('reminders.addLabel')}
//                 </label>
//                 <textarea
//                     value={newTodo}
//                     onChange={(e) => setNewTodo(e.target.value)}
//                     rows={3}
//                     placeholder={t('reminders.placeholder')}
//                     className="w-full p-3 border border-gray-300 rounded-md resize-none focus:outline-blue-500 text-sm"
//                 />
//                 <button
//                     onClick={handleAdd}
//                     className="mt-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md shadow transition"
//                 >
//                     {t('reminders.addButton')}
//                 </button>
//             </div>

//             <ul className="space-y-4">
//                 {todos.map((todo) => (
//                     <li
//                         key={todo.id}
//                         className={`flex justify-between items-start gap-4 bg-white p-4 rounded-md shadow border ${
//                             todo.completed ? 'opacity-60' : ''
//                         }`}
//                     >
//                         <div className="flex-1">
//                             <p
//                                 className={`text-sm ${
//                                     todo.completed ? 'line-through text-gray-500' : 'text-gray-800'
//                                 }`}
//                             >
//                                 {todo.content}
//                             </p>
//                         </div>
//                         <div className="flex items-center gap-2">
//                             <button
//                                 onClick={() => handleToggle(todo.id)}
//                                 className={`text-xs font-medium px-3 py-1 rounded-md transition ${
//                                     todo.completed
//                                         ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
//                                         : 'bg-green-100 text-green-800 hover:bg-green-200'
//                                 }`}
//                             >
//                                 {todo.completed ? t('reminders.undone') : t('reminders.done')}
//                             </button>
//                             <button
//                                 onClick={() => handleDelete(todo.id)}
//                                 className="text-xs font-medium px-3 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
//                             >
//                                 {t('reminders.delete')}
//                             </button>
//                         </div>
//                     </li>
//                 ))}
//             </ul>
//         </div>
//     );
// }

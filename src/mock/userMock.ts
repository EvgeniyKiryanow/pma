import type { User } from '../types/user';
const users: User[] = [
    {
        id: 1,
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        photo: '', // put photo url/path here
        dateOfBirth: '1985-04-12',
        position: 'Commander',
        rank: 'Captain',
        rights: 'Top Secret Clearance',
        conscriptionInfo: 'Drafted in Kyiv, 2003, by military office #12',
        notes: 'test',
        relatives: [
            { name: 'Anna Doe', relationship: 'wife', phone: '+123456789' },
            { name: 'Mike Doe', relationship: 'brother' },
        ],
        comments: [
            {
                id: 101,
                date: '2023-01-15',
                author: 'Admin',
                type: 'text',
                content: 'Excellent leadership skills.',
                files: [],
            },
        ],
        history: [
            {
                id: 201,
                date: '2020-10-10',
                type: 'pdf',
                content: '/files/service_record_john_doe.pdf',
                description: 'Service record document',
                files: [],
            },
        ],
        phoneNumber: 123412341234,
    },
    {
        id: 2,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        photo: '',
        dateOfBirth: '1990-08-30',
        position: 'Strategist',
        rank: 'Lieutenant',
        rights: 'Confidential',
        conscriptionInfo: 'Drafted in Lviv, 2008, by military office #5',
        relatives: [{ name: 'Bob Smith', relationship: 'father' }],
        comments: [],
        history: [],
        notes: 'test',
        phoneNumber: 123412341234,
    },
    {
        id: 3,
        fullName: 'Sam Wilson',
        email: 'sam.wilson@example.com',
        photo: '',
        dateOfBirth: '1988-12-25',
        position: 'Medic Specialist',
        rank: 'Sergeant',
        rights: 'Restricted',
        conscriptionInfo: 'Drafted in Odessa, 2010, by military office #3',
        relatives: [],
        comments: [],
        history: [],
        notes: 'test',
        phoneNumber: 123412341234,
    },
];

export default users;

// Mock data for Timbra MVP
export const mockFriendData = {
    currentlyListening: [
        {
            id: 1,
            fid: 1245,
            name: "0xWave",
            username: "wave",
            profileImage: "/api/placeholder/100/100",
            track: {
                title: "Midnight City",
                artist: "M83",
                album: "Hurry Up, We're Dreaming",
                albumArt: "/api/placeholder/60/60",
                duration: "4:03",
                currentTime: "2:15",
                type: "song"
            },
            timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
        },
        {
            id: 2,
            fid: 5678,
            name: "Crypto Kate",
            username: "cryptokate",
            profileImage: "/api/placeholder/100/100",
            track: {
                title: "The Joe Rogan Experience #1969",
                artist: "Joe Rogan",
                albumArt: "/api/placeholder/60/60",
                duration: "3:12:44",
                currentTime: "1:05:30",
                type: "podcast"
            },
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        },
        {
            id: 3,
            fid: 9012,
            name: "Web3 Builder",
            username: "web3builder",
            profileImage: "/api/placeholder/100/100",
            track: {
                title: "Blinding Lights",
                artist: "The Weeknd",
                album: "After Hours",
                albumArt: "/api/placeholder/60/60",
                duration: "3:20",
                currentTime: "0:45",
                type: "song"
            },
            timestamp: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
        },
        {
            id: 4,
            fid: 3456,
            name: "Degen Dave",
            username: "degendave",
            profileImage: "/api/placeholder/100/100",
            track: {
                title: "Industry Baby",
                artist: "Lil Nas X",
                album: "MONTERO",
                albumArt: "/api/placeholder/60/60",
                duration: "3:32",
                currentTime: "2:10",
                type: "song"
            },
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        },
        {
            id: 5,
            fid: 7890,
            name: "Smart Contract Sally",
            username: "scsally",
            profileImage: "/api/placeholder/100/100",
            track: {
                title: "Bankless: The Future of DeFi",
                artist: "Bankless",
                albumArt: "/api/placeholder/60/60",
                duration: "1:25:12",
                currentTime: "45:22",
                type: "podcast"
            },
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        }
    ],

    topWeeklyTracks: [
        {
            id: 1,
            title: "Silk Chiffon",
            artist: "MUNA, Phoebe Bridgers",
            albumArt: "/api/placeholder/60/60",
            listenerCount: 12,
            listeners: [
                { name: "0xWave", fid: 1245 },
                { name: "Crypto Kate", fid: 5678 },
                { name: "Web3 Builder", fid: 9012 }
            ]
        },
        {
            id: 2,
            title: "Late Night Talking",
            artist: "Harry Styles",
            albumArt: "/api/placeholder/60/60",
            listenerCount: 9,
            listeners: [
                { name: "Degen Dave", fid: 3456 },
                { name: "Smart Contract Sally", fid: 7890 }
            ]
        },
        {
            id: 3,
            title: "Running Up That Hill",
            artist: "Kate Bush",
            albumArt: "/api/placeholder/60/60",
            listenerCount: 8,
            listeners: [
                { name: "0xWave", fid: 1245 },
                { name: "Smart Contract Sally", fid: 7890 }
            ]
        },
        {
            id: 4,
            title: "As It Was",
            artist: "Harry Styles",
            albumArt: "/api/placeholder/60/60",
            listenerCount: 7,
            listeners: [
                { name: "Crypto Kate", fid: 5678 },
                { name: "Web3 Builder", fid: 9012 }
            ]
        },
        {
            id: 5,
            title: "Titi Me Preguntó",
            artist: "Bad Bunny",
            albumArt: "/api/placeholder/60/60",
            listenerCount: 5,
            listeners: [
                { name: "Degen Dave", fid: 3456 }
            ]
        }
    ]
};
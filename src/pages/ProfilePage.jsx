import { useParams } from 'react-router-dom';

export default function ProfilePage() {
  const { userId } = useParams();
  
  return (
    <div className="flex justify-center items-center h-full">
      <h1 className="font-black text-2xl">Profil de {userId}</h1>
    </div>
  );
}

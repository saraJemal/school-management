'use client'

import { SignIn, useUser } from '@clerk/nextjs'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const LoginPage = () => {

 const { isSignedIn, user, isLoaded } = useUser();
 const router = useRouter();


useEffect(() => {
  if (!isLoaded) return

    if (isSignedIn) {
      const role = user?.publicMetadata?.role

      if (role) {
        router.replace(`/${role}`)
      } else {
        router.replace('/')
      }
    }
  }, [isLoaded, isSignedIn, user, router])

  //prevent rendering SignIn if signed in
  if (!isLoaded || isSignedIn) {
    return null
  }
  return(
    <div className="h-screen flex items-center justify-center bg-yellow-100">
      <div className="bg-white p-12 rounded-md shadow-2xl flex flex-col gap-2">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Image
            src="/badirLogo.png"
            alt="Badir Academy"
            width={24}
            height={24}
          />
          Badir Academy Information System
        </h1>

        <h2 className="text-gray-400 mb-4">
          Sign In To Your Account
        </h2>

        <SignIn 
              appearance={{
                elements: {
                  card: "!shadow-none bg-transparent",
                  formButtonPrimary: "bg-badirBlue hover:bg-black",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  header: "hidden",
                  footer: "hidden",
                },
              }}
        />
      </div>
    </div>
  );
};
export default LoginPage;
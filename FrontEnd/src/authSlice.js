import { createAsyncThunk,createSlice } from '@reduxjs/toolkit'

import axiosClient from './utils/axiosClient'

const toErrorPayload = (error) => ({
   message:
      (typeof error?.response?.data === 'string' ? error.response.data : error?.response?.data?.message) ||
      error?.message ||
      'Request failed',
   status: error?.response?.status ?? null,
});



export const registerUser = createAsyncThunk(
   'auth/register',
   async (userData,{rejectWithValue})=>{
      try {
         const response = await axiosClient.post('/user/register',userData)
         return response.data.user
         
      } catch (error) {
         return rejectWithValue(toErrorPayload(error))
         
      }
   }
)

export const loginUser  =createAsyncThunk(
   'auth/login',
   async (credentials , {rejectWithValue})=>{
      try {
         const response = await axiosClient.post('/user/login',credentials)
         return response.data.user
      } catch (error) {
         return rejectWithValue(toErrorPayload(error))
      }
   }
)

export const checkAuth = createAsyncThunk(
   'auth/check',
   async(_ , {rejectWithValue})=>{
      try {
         const {data} = await axiosClient.get('/user/check')
         return data.user
         
      } catch (error) {
         return rejectWithValue(toErrorPayload(error))
         
      }
   }
)


export const logoutUser = createAsyncThunk(
   'auth/logout',
   async(_ , {rejectWithValue} )=>{
      try {
         await axiosClient.post('/user/logout');
         return null;
         
      } catch (error) {
         return rejectWithValue(toErrorPayload(error))
      }
   }
)


const authSlice = createSlice({
   name:'auth',
   initialState:{
      user:null,
      isAuthenticated:false,
      // Start in loading state so route guards wait for checkAuth on first app mount.
      loading:true,
      error:null
      
   },
   reducers:{

   },
   extraReducers:(builder)=>{

      builder
      // registerUser
      .addCase(registerUser.pending,(state)=>{
         state.loading=true;
         state.error=null;
      })
      .addCase(registerUser.fulfilled,(state,action)=>{
         state.loading = false;
         state.isAuthenticated = !!action.payload;
         state.user = action.payload;
      })
      .addCase(registerUser.rejected, (state,action)=>{
         state.loading=false;
         state.error = action.payload?.message || "Something Went Rong";
         state.isAuthenticated = false;
         state.user = null;
      })

      // Login usercase
      .addCase(loginUser.pending, (state)=>{
         state.loading = true;
         state.error = null;
      })

      .addCase(loginUser.fulfilled,(state,action)=>{
         state.loading = false;
         state.isAuthenticated = !!action.payload;
         state.user = action.payload;
      })
      .addCase(loginUser.rejected, (state,action)=>{
         state.loading = false;
         state.error = action.payload?.message ||"Something wend Wrong";
         state.isAuthenticated = false;
         state.user = null;
      })

      // cases for check user auth
      .addCase(checkAuth.pending, (state)=>{
         state.loading = true;
         state.error = null
      })

      .addCase(checkAuth.fulfilled,(state,action)=>{
         state.loading = false;
         state.isAuthenticated = !!action.payload;
         state.user = action.payload;
      })

      .addCase(checkAuth.rejected,(state,action)=>{
         state.loading = false;
         state.error = action.payload?.message || "Some thing went Wrong";
         state.isAuthenticated = false;
         state.user = null
      })

      // Addimg case for logout
      .addCase(logoutUser.pending,(state)=>{
         state.loading = true;
         state.error = null;
      })

      .addCase(logoutUser.fulfilled,(state)=>{
         state.loading = false;
         state.user = null;
         state.isAuthenticated = false;
         state.error = null
      })

      .addCase(logoutUser.rejected, (state,action)=>{
         state.loading = false;
         state.error = action.payload?.message||"Something went Wrong";
         state.isAuthenticated = false;
         state.user = null;
      })


   }
   

})

export default authSlice.reducer


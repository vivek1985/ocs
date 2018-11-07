%%% vim: ts=3
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% @copyright 2008 Motivity Telecom Inc.
%%% @end
%%% Licensed under the Apache License, Version 2.0 (the "License");
%%% you may not use this file except in compliance with the License.
%%% You may obtain a copy of the License at
%%%
%%%     http://www.apache.org/licenses/LICENSE-2.0
%%%
%%% Unless required by applicable law or agreed to in writing, software
%%% distributed under the License is distributed on an "AS IS" BASIS,
%%% WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
%%% See the License for the specific language governing permissions and
%%% limitations under the License.
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%%% @doc This module implements the MILENAGE algorithm set.
%%%
%%% 	Within the security architecture of the 3GPP system there are
%%% 	seven security functions; f1, f1*, f2, f3, f4, f5 and f5* used for
%%% 	authentication and key generation.  The operation of these functions
%%% 	is to be specified by each operator and as such is not fully
%%% 	standardised.  The algorithms implemented here follow the examples 
%%% 	produced on request from 3GPP by <a href="http://portal.etsi.org/sage">
%%% 	ETSI SAGE Task Force</a> and are based on the block cipher Rinjindael
%%% 	now known as Advanced Encryption Standard (AES).
%%%
%%% @reference <a href="http://www.3gpp.org/ftp/Specs/html-info/35206.htm">
%%% 	3GPP TS 35.206 3G Security; Specification of the MILENAGE algorithm set:
%%% 	An example algorithm set for the 3GPP authentication and key
%%% 	generation functions f1, f1*, f2, f3, f4, f5 and f5*;
%%% 	Document 2: Algorithm specification</a>
%%%
-module(ocs_milenage).
-copyright('Copyright (c) 2008 Motivity Telecom Inc.').
-author('vances@motivity.ca').

%% export the API
-export([f1/5, f2345/3, 'f1*'/5, f5/3, 'f5*'/3]).
-export([opc/2]).

%% defined constants
-define(c1, <<0:128>>).
-define(c2, <<0:127, 1:1>>).
-define(c3, <<0:126, 1:1, 0:1>>).
-define(c4, <<0:125, 1:1, 0:2>>).
-define(c5, <<0:124, 1:1, 0:3>>).
-define(r1, 64).
-define(r2, 0).
-define(r3, 32).
-define(r4, 64).
-define(r5, 96).

%%----------------------------------------------------------------------
%%  The milenage API
%%----------------------------------------------------------------------

-type k() :: binary().
%% @type k() = binary().
%% 	A 128 bit subscriber authentication key (K) known only to the
%% 	HSS and the ISIM/USIM application on the UICC.
%%
-type opc() :: binary().
%% @type opc() = binary().
%% 	A 128 bit key (OPc) derived from the Operator Variant Algorithm
%% 	Configuration Field (OP) and {@link k(). K} known only to the
%% 	HSS and the ISIM/USIM application on the UICC.
%%
-type op() :: binary().
%% @type op() = binary().
%% 	A 128 bit operator variant algorithm configuration field (OP).
%%
-type rand() :: binary().
%% @type rand() = binary().
%% 	A 128 bit random challenge (RAND).
%%
-type sqn() :: binary().
%% @type sqn() = binary().
%% 	A 48 bit sequence number (SQN).  The management of sequence 
%% 	numbers is specified in
%% 	<a href="http://www.3gpp.org/ftp/Specs/html-info/33102.htm">
%% 	3GPP TS 33.102</a> Annex C.  The current implementation of
%% 	the {@link //hss/hss_server. hss_server} module uses sequence
%% 	numbers which are not time-based as described in C.1.1.2 and
%% 	C.3.2.  `SQN = SQE || IND' where the length of `IND' is five 
%% 	bits or in Erlang terms `SQN = <<SQE:43, IND:5>>'.
%%
-type amf() :: binary().
%% @type amf() = binary().
%% 	A 16 bit authentication management field (AMF).
%%
-type mac() :: binary().
%% @type mac() = binary().
%% 	A 64 bit message authentication code (MAC).
%%
-type res() :: binary().
%% @type res() = binary().
%% 	A 64 bit challenge response (RES).
%%
-type ak() :: binary().
%% @type ak() = binary().
%% 	A 48 bit anonymity key (AK).
%%
-type ck() :: binary().
%% @type ck() = binary().
%% 	A 128 bit confidentiality key (AK).
%%
-type ik() :: binary().
%% @type ik() = binary().
%% 	A 128 bit integrity key (AK).
%%

-spec f1(OPc, K, RAND, SQN, AMF) -> MAC_A
	when
		OPc :: opc(),
		K :: k(),
		RAND :: rand(),
		SQN :: sqn(),
		AMF :: amf(),
		MAC_A :: mac().
%% @doc Computes network authentication code MAC-A.	
%%
%% 	Takes as input the derived OPc, subscriber key K, random
%% 	challenge RAND, sequence number SQN and authentication management
%% 	field AMF. Returns the network authentication code MAC-A.
%%
f1(OPc, K, RAND, SQN, AMF) ->
	TEMP = temp(OPc, K, RAND),
	IN1 = in1(SQN, AMF),
	<<MAC_A:8/binary, _:8/binary>> = out1(OPc, K, TEMP, IN1),
	MAC_A.

-spec 'f1*'(OPc, K, RAND, SQN, AMF) -> MAC_S
	when
		OPc :: opc(),
		K :: k(),
		RAND :: rand(),
		SQN :: sqn(),
		AMF :: amf(),
		MAC_S :: mac().
%% @doc Computes resynch authentication code MAC-S.
%%
%% 	Takes as input the derived OPc, subscriber key K, random
%% 	challenge RAND, sequence number SQN and authentication management
%% 	field AMF. Returns the resynch authentication code MAC-S.
%%
'f1*'(OPc, K, RAND, SQN, AMF) ->
	TEMP = temp(OPc, K, RAND),
	IN1 = in1(SQN, AMF),
	<<_:8/binary, MAC_S:8/binary>> = out1(OPc, K, TEMP, IN1),
	MAC_S.

-spec f2345(OPc, K, RAND) -> {RES, CK, IK, AK}
	when
		OPc :: opc(),
		K :: k(),
		RAND :: rand(),
		RES :: res(),
		CK :: ck(),
		IK :: ik(),
		AK :: ak().
%% @doc Computes response and keys.
%%
%% 	Takes as input the derived OPc, subscriber key K and random
%% 	challenge RAND.  Returns response RES, confidentiality key CK,
%% 	integrity key IK and anonymity key AK.
%%
f2345(OPc, K, RAND) ->
	TEMP = temp(OPc, K, RAND),
	<<AK:6/binary, _:2/binary, RES:8/binary>> = out2(OPc, K, TEMP),
	CK = out3(OPc, K, TEMP),
	IK = out4(OPc, K, TEMP),
	{RES, CK, IK, AK}.
	
-spec f5(OPc, K, RAND) -> AK
	when
		OPc :: opc(),
		K :: k(),
		RAND :: rand(),
		AK :: ak().
%% @doc Computes resynch anonymity key AK. 
%%
%% 	Takes as input the derived OPc, subscriber key K and random
%% 	challenge RAND.  Returns the anonymity key AK.
%%
f5(OPc, K, RAND) ->
	TEMP = temp(OPc, K, RAND),
	<<AK:6/binary, _/binary>> = out2(OPc, K, TEMP),
	AK.

-spec 'f5*'(OPc, K, RAND) -> AK
	when
		OPc :: opc(),
		K :: k(),
		RAND :: rand(),
		AK :: ak().
%% @doc Computes resynch anonymity key AK. 
%%
%% 	Takes as input the derived OPc, subscriber key K and random
%% 	challenge RAND.  Returns the anonymity key AK.
%%
'f5*'(OPc, K, RAND) ->
	TEMP = temp(OPc, K, RAND),
	<<AK:6/binary, _/binary>> = out5(OPc, K, TEMP),
	AK.

-spec opc(OP, K) -> OPc
	when
		OP :: op(),
		K :: k(),
		OPc :: opc().
%% @doc Encode the Operator Variant Algorithm Configuration Field (OP).
%%
%% 	Each operator chooses a value of OP to provide separation between
%% 	the functionality of the algorithms when used by different
%% 	operators.  The value OPc is used as input for the security
%% 	functions and is derived from OP and the subscriber key (K).
%% 	
opc(OP, K) ->
	crypto:block_encrypt(aes_cfb128, K, OP, OP).

%%----------------------------------------------------------------------
%% The milenage internal functions
%%----------------------------------------------------------------------

-spec temp(OPc, K, RAND) -> TEMP
	when
		OPc :: opc(),
		K :: k(),
		RAND :: rand(),
		TEMP :: binary().
%% @doc Computes a 128 bit temporary value.
%%
%% 	Takes as input the derived OPc, subscriber key K, random
%% 	and challenge RAND.  Returns a 128 bit temporary value used in
%% 	the output functions.
%% @hidden
temp(OPc, K, RAND) ->
	crypto:block_encrypt(aes_cbc128, K, OPc, RAND).
	
-spec in1(SQN, AMF) -> IN1
	when
		SQN :: sqn(),
		AMF :: amf(),
		IN1 :: binary().
%% @doc Creates a 128 bit input value for f1/f1*.
%%
%% 	Takes as input the sequence number SQN and authentication
%% 	management field AMF. Returns a 128 bit temporary value used
%% 	in f1/f1*.
%% @hidden
in1(SQN, AMF) when size(SQN) == 6, size(AMF) == 2 ->
	<<SQN/binary, AMF/binary, SQN/binary, AMF/binary>>.

-spec out1(OPc, K, TEMP, IN1) -> OUT1
	when
		OPc :: opc(),
		K :: k(),
		TEMP :: binary(),
		IN1 :: binary(),
		OUT1 :: binary().
%% @doc Creates a 128 bit output value for f1/f1*.
%%
%% 	Takes as input the derived OPc, subscriber key K and temporary
%% 	values TEMP and IN1. TEMP and IN1 are each 128 bit values.
%% 	Returns a 128 bit temporary value used in f1/f1*.
%% @hidden
out1(OPc, K, TEMP, IN1) ->
	A = crypto:exor(IN1, OPc),
	B = rot(A, ?r1),
	C = crypto:exor(TEMP, B),
	D = crypto:exor(C, ?c1),
	crypto:block_encrypt(aes_cfb128, K, D, OPc).

-spec out2(OPc, K, TEMP) -> OUT2
	when
		OPc :: opc(),
		K :: k(),
		TEMP :: binary(),
		OUT2 :: binary().
%% @doc Creates a 128 bit output value for f2/f5.
%%
%% 	Takes as input the derived OPc, subscriber key K and temporary
%% 	value TEMP. TEMP is a 128 bit value.  Returns a 128 bit temporary
%% 	value used in f2/f5.
%% @hidden
out2(OPc, K, TEMP) ->
	A = crypto:exor(TEMP, OPc),
	B = rot(A, ?r2),
	C = crypto:exor(B, ?c2),
	crypto:block_encrypt(aes_cfb128, K, C, OPc).

-spec out3(OPc, K, TEMP) -> OUT3
	when
		OPc :: opc(),
		K :: k(),
		TEMP :: binary(),
		OUT3 :: binary().
%% @doc Creates a 128 bit output value for f2.
%%
%% 	Takes as input the derived OPc, subscriber key K and temporary
%% 	value TEMP. TEMP is a 128 bit value.  Returns a 128 bit temporary
%% 	value used in f2.
%% @hidden
out3(OPc, K, TEMP) ->
	A = crypto:exor(TEMP, OPc),
	B = rot(A, ?r3),
	C = crypto:exor(B, ?c3),
	crypto:block_encrypt(aes_cfb128, K, C, OPc).

-spec out4(OPc, K, TEMP) -> OUT4
	when
		OPc :: opc(),
		K :: k(),
		TEMP :: binary(),
		OUT4 :: binary().
%% @doc Creates a 128 bit output value for f4.
%%
%% 	Takes as input the derived OPc, subscriber key K and temporary
%% 	value TEMP. TEMP is a 128 bit value.  Returns a 128 bit temporary
%% 	value used in f4.
%% @hidden
out4(OPc, K, TEMP) ->
	A = crypto:exor(TEMP, OPc),
	B = rot(A, ?r4),
	C = crypto:exor(B, ?c4),
	crypto:block_encrypt(aes_cfb128, K, C, OPc).

-spec out5(OPc, K, TEMP) -> OUT5
	when
		OPc :: opc(),
		K :: k(),
		TEMP :: binary(),
		OUT5 :: binary().
%% @doc Creates a 128 bit output value for f5*.
%%
%% 	Takes as input the derived OPc, subscriber key K and temporary
%% 	value TEMP. TEMP is a 128 bit value.  Returns a 128 bit temporary
%% 	value used in f5*.
%% @hidden
out5(OPc, K, TEMP) ->
	A = crypto:exor(TEMP, OPc),
	B = rot(A, ?r5),
	C = crypto:exor(B, ?c5),
	crypto:block_encrypt(aes_cfb128, K, C, OPc).

-spec rot(X, R) -> binary()
	when
		X :: binary(),
		R :: integer().
%% @doc Cyclical binary shift left.
%%
%% 	Cyclically rotates the binary value X by R bit positions towards
%% 	the most significant bit.
%% @hidden
rot(X, 0) ->
	X;
rot(B, R) ->
	Len = R div 8,
	<<X:Len/binary, Y/binary>> = B,
	<<Y/binary, X/binary>>.

